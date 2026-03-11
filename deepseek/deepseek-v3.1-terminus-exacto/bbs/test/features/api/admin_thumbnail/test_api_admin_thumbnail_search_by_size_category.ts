import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentThumbnail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test admin thumbnail search filtering by size categories (small, medium, large, extra_large).
 * Create articles with image attachments that generate thumbnails across different size categories.
 * Search for thumbnails filtered by specific size categories and verify that only thumbnails
 * matching the requested size category are returned. Test combinations of size categories and
 * dimensional ranges to ensure filtering logic works correctly. Validate that thumbnail metadata
 * includes correct size categorization based on actual dimensions.
 */
export async function test_api_admin_thumbnail_search_by_size_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assertGuard<api.IConnection>(adminConnection);
  // 2. Create member account to post articles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assertGuard<api.IConnection>(memberConnection);
  // 3. Create multiple articles with image attachments
  // We'll create 5 articles with attachments to generate thumbnails
  const attachments: IDiscussionBoardAttachment[] = [];
  for (let i = 0; i < 5; i++) {
    // Create article
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 3,
              wordMax: 7,
            }),
            body: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    typia.assert(article);
    // Create image attachment (simulating different image sizes)
    const attachment =
      await generate_random_discussion_board_member_articles_attachments_create(
        memberConnection,
        {
          body: {
            filename: `image${i}.jpg`,
            filetype: "jpg",
            mime_type: "image/jpeg",
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1024> &
                tags.Maximum<10485760>
            >(),
          },
          params: {
            articleId: article.id,
          },
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }
  // 4. Wait a bit for thumbnail generation (server-side)
  // In real scenario, thumbnails are generated automatically.
  // We'll proceed with search tests.
  // 5. Test search with no filters - get all thumbnails
  const allThumbnails =
    await api.functional.discussionBoard.admin.thumbnails.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(allThumbnails);
  // Log for debugging
  console.log(
    `Total thumbnails available: ${allThumbnails.pagination.records}`,
  );
  // 6. Test search with each size category
  const sizeCategories = ["small", "medium", "large", "extra_large"] as const;
  for (const category of sizeCategories) {
    const filteredResults =
      await api.functional.discussionBoard.admin.thumbnails.index(
        adminConnection,
        {
          body: {
            size_category: category,
            page: 1,
            limit: 100,
          } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
        },
      );
    typia.assert(filteredResults);
    // Validate that all returned thumbnails have the requested size category
    for (const thumbnail of filteredResults.data) {
      TestValidator.equals(
        `thumbnail size_category should be ${category}`,
        thumbnail.size_category,
        category,
      );
    }
    console.log(
      `Category ${category}: ${filteredResults.data.length} thumbnails`,
    );
  }
  // 7. Test combination of size category with dimensional ranges
  // Test with width_min and width_max
  const widthMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100>
  >();
  const widthMax = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<500> & tags.Maximum<1000>
  >();
  const dimensionalSearch =
    await api.functional.discussionBoard.admin.thumbnails.index(
      adminConnection,
      {
        body: {
          size_category: "medium",
          width_min: widthMin,
          width_max: widthMax,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(dimensionalSearch);
  // Validate thumbnail dimensions are within range (if any results)
  for (const thumbnail of dimensionalSearch.data) {
    TestValidator.predicate(
      `thumbnail width ${thumbnail.width} >= width_min ${widthMin}`,
      thumbnail.width >= widthMin,
    );
    TestValidator.predicate(
      `thumbnail width ${thumbnail.width} <= width_max ${widthMax}`,
      thumbnail.width <= widthMax,
    );
    TestValidator.equals(
      "thumbnail size_category should be medium",
      thumbnail.size_category,
      "medium",
    );
  }
  // 8. Test sorting
  const sortedByWidth =
    await api.functional.discussionBoard.admin.thumbnails.index(
      adminConnection,
      {
        body: {
          sort: "width:asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(sortedByWidth);
  // Validate ascending order
  for (let i = 1; i < sortedByWidth.data.length; i++) {
    const prev = sortedByWidth.data[i - 1];
    const curr = sortedByWidth.data[i];
    TestValidator.predicate(
      `width should be ascending: ${prev.width} <= ${curr.width}`,
      prev.width <= curr.width,
    );
  }
  // 9. Test error case: invalid size category (should be validated by typia)
  // This is a type error test which is prohibited, so we skip it.
  console.log("All thumbnail search tests passed");
}