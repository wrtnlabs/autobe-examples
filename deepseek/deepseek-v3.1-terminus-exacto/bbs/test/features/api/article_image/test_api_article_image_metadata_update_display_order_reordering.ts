import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_image_metadata_update_display_order_reordering(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create an article with a random section ID
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Create three images with sequential display orders
  const images: IDiscussionBoardArticleFile[] = [];
  for (let i = 1; i <= 3; i++) {
    const image =
      await generate_random_discussion_board_super_admin_articles_images_create(
        superAdminConnection,
        {
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: i satisfies number as number,
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
          params: { articleId: article.id },
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // Verify initial display orders are correct
  TestValidator.equals("image 1 display order", images[0].display_order, 1);
  TestValidator.equals("image 2 display order", images[1].display_order, 2);
  TestValidator.equals("image 3 display order", images[2].display_order, 3);
  // Update the middle image's display order to position 3
  const updatedImage =
    await api.functional.discussionBoard.superAdmin.articles.images.update(
      superAdminConnection,
      {
        articleId: article.id,
        imageId: images[1].id,
        body: {
          display_order: 3 satisfies number as number,
          alt_text: images[1].alt_text,
          caption: images[1].caption,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // Verify the updated image has correct metadata
  TestValidator.equals(
    "updated image has new display order",
    updatedImage.display_order,
    3,
  );
  TestValidator.equals(
    "updated image ID matches",
    updatedImage.id,
    images[1].id,
  );
  // Since there's no endpoint to list or retrieve individual images after creation,
  // we focus on testing what we can verify with the available APIs:
  // 1. Initial creation with sequential orders works
  // 2. Update operation successfully changes the display order
  // 3. The system accepts the update without errors
  // Additional verification: Test that duplicate display orders are prevented
  // by attempting to create another image with the same display order
  await TestValidator.error(
    "should prevent duplicate display orders",
    async () => {
      await generate_random_discussion_board_super_admin_articles_images_create(
        superAdminConnection,
        {
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: 3 satisfies number as number, // Same as updated image
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
          params: { articleId: article.id },
        },
      );
    },
  );
}
