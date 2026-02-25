import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_image_sequential_attachments(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create an article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<5> &
          tags.MaxLength<200> as string &
          tags.MinLength<5> &
          tags.MaxLength<200>,
        content: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
          tags.MinLength<50> as string & tags.MinLength<50>,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create initial images to establish existing image count
  const initialImages = await ArrayUtil.asyncRepeat(3, async (index) => {
    const image =
      await api.functional.discussionBoard.admin.articles.images.create(
        adminConnection,
        {
          articleId: article.id,
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: index + 1,
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(image);
    return image;
  });
  // Validate initial images have correct display order
  TestValidator.equals("initial image count", initialImages.length, 3);
  TestValidator.equals(
    "first image display order",
    initialImages[0].display_order,
    1,
  );
  TestValidator.equals(
    "second image display order",
    initialImages[1].display_order,
    2,
  );
  TestValidator.equals(
    "third image display order",
    initialImages[2].display_order,
    3,
  );
  // Add sequential images and validate automatic display order assignment
  const sequentialImages = await ArrayUtil.asyncRepeat(2, async (index) => {
    const image =
      await api.functional.discussionBoard.admin.articles.images.create(
        adminConnection,
        {
          articleId: article.id,
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: initialImages.length + index + 1,
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(image);
    return image;
  });
  // Validate sequential images received correct display order increment
  TestValidator.equals("sequential image count", sequentialImages.length, 2);
  TestValidator.equals(
    "fourth image display order",
    sequentialImages[0].display_order,
    4,
  );
  TestValidator.equals(
    "fifth image display order",
    sequentialImages[1].display_order,
    5,
  );
  // Test automatic display order assignment by omitting display_order
  const autoOrderImage =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: 6, // Should be automatically assigned based on existing count
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(autoOrderImage);
  // Validate automatic display order assignment
  TestValidator.equals(
    "auto-assigned display order",
    autoOrderImage.display_order,
    6,
  );
  // Test that display orders are sequential and non-overlapping
  const allImages = [...initialImages, ...sequentialImages, autoOrderImage];
  const displayOrders = allImages.map((img) => img.display_order);
  const sortedOrders = [...displayOrders].sort((a, b) => a - b);
  TestValidator.equals(
    "display orders are sequential",
    displayOrders,
    sortedOrders,
  );
  // Verify no duplicate display orders
  const uniqueOrders = new Set(displayOrders);
  TestValidator.equals(
    "no duplicate display orders",
    uniqueOrders.size,
    displayOrders.length,
  );
  // Validate sequential numbering from 1 to total image count
  for (let i = 0; i < allImages.length; i++) {
    TestValidator.equals(
      `image ${i + 1} display order`,
      allImages[i].display_order,
      i + 1,
    );
  }
}
