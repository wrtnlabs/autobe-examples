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

export async function test_api_article_image_cross_article_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create section for articles (using a random section ID from the system)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create first article
  const firstArticle =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: sectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(firstArticle);
  // Create second article in the same section
  const secondArticle =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: sectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(secondArticle);
  // Attach image to first article
  const image =
    await generate_random_discussion_board_super_admin_articles_images_create(
      superAdminConnection,
      {
        params: { articleId: firstArticle.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(image);
  // Attempt to update the image using second article's ID (cross-article permission violation)
  await TestValidator.error(
    "cross-article image update should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.images.update(
        superAdminConnection,
        {
          articleId: secondArticle.id, // Wrong article ID
          imageId: image.id,
          body: {
            display_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardArticleFile.IUpdate,
        },
      );
    },
  );
  // Verify image update works correctly with the proper article ID
  const newDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const newAltText = RandomGenerator.paragraph({ sentences: 1 });
  const newCaption = RandomGenerator.paragraph({ sentences: 1 });
  const updatedImage =
    await api.functional.discussionBoard.superAdmin.articles.images.update(
      superAdminConnection,
      {
        articleId: firstArticle.id, // Correct article ID
        imageId: image.id,
        body: {
          display_order: newDisplayOrder,
          alt_text: newAltText,
          caption: newCaption,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updatedImage);
  TestValidator.equals(
    "image ID should remain the same",
    updatedImage.id,
    image.id,
  );
  TestValidator.equals(
    "display_order should be updated",
    updatedImage.display_order,
    newDisplayOrder,
  );
  TestValidator.equals(
    "alt_text should be updated",
    updatedImage.alt_text,
    newAltText,
  );
  TestValidator.equals(
    "caption should be updated",
    updatedImage.caption,
    newCaption,
  );
}
