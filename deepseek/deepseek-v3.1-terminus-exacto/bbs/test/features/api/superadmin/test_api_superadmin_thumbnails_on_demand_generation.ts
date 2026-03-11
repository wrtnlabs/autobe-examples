import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentThumbnail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test thumbnail generation on-demand functionality when filtering requests non-existent thumbnail sizes.
 */
export async function test_api_superadmin_thumbnails_on_demand_generation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create member user connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create test article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // 4. Create attachment for thumbnail generation
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: `test-${RandomGenerator.alphabets(8)}.jpg`,
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<1000000>
          >(),
        },
      },
    );
  typia.assert(attachment);
  // 5. Test on-demand generation for different size categories
  const sizeCategories = ["small", "medium", "large", "extra_large"] as const;
  for (const sizeCategory of sizeCategories) {
    // Initial search should trigger on-demand generation
    const searchResult =
      await api.functional.discussionBoard.superAdmin.thumbnails.index(
        superAdminConnection,
        {
          body: {
            attachment_id: attachment.id,
            size_category: sizeCategory,
            limit: 10,
          } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
        },
      );
    typia.assert(searchResult);
    // Verify thumbnail was generated
    TestValidator.notEquals(
      `search should return thumbnails for ${sizeCategory}`,
      searchResult.data.length,
      0,
    );
    // Validate thumbnail metadata
    const thumbnail = searchResult.data[0];
    TestValidator.equals(
      `thumbnail size category should be ${sizeCategory}`,
      thumbnail.size_category,
      sizeCategory,
    );
    TestValidator.predicate(
      `thumbnail should have valid dimensions for ${sizeCategory}`,
      thumbnail.width > 0 && thumbnail.height > 0,
    );
    TestValidator.predicate(
      `thumbnail should have file size for ${sizeCategory}`,
      thumbnail.file_size > 0,
    );
    TestValidator.predicate(
      `thumbnail should have content type for ${sizeCategory}`,
      thumbnail.content_type.startsWith("image/"),
    );
    TestValidator.equals(
      `thumbnail should belong to correct attachment for ${sizeCategory}`,
      thumbnail.attachment.id,
      attachment.id,
    );
  }
  // 6. Test dimensional range filtering
  const rangeResult =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          attachment_id: attachment.id,
          width_min: 100,
          width_max: 500,
          height_min: 100,
          height_max: 500,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(rangeResult);
  // Validate dimensional constraints
  for (const thumbnail of rangeResult.data) {
    TestValidator.predicate(
      "thumbnail width should be within range",
      thumbnail.width >= 100 && thumbnail.width <= 500,
    );
    TestValidator.predicate(
      "thumbnail height should be within range",
      thumbnail.height >= 100 && thumbnail.height <= 500,
    );
  }
  // 7. Test impossible dimensional range (should return empty results)
  const impossibleResult =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          attachment_id: attachment.id,
          width_min: 10000,
          width_max: 20000,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(impossibleResult);
  TestValidator.equals(
    "impossible dimensional range should return empty results",
    impossibleResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be zero for impossible range",
    impossibleResult.pagination.records,
    0,
  );
  // 8. Test non-existent attachment (should return empty results)
  const nonExistentResult =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          attachment_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(nonExistentResult);
  TestValidator.equals(
    "non-existent attachment should return empty results",
    nonExistentResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination should show zero records for non-existent attachment",
    nonExistentResult.pagination.records === 0,
  );
  // 9. Test sorting functionality
  const sortedResult =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          attachment_id: attachment.id,
          sort: "created_at:desc",
          limit: 5,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Verify sorting order
  for (let i = 1; i < sortedResult.data.length; i++) {
    const prevDate = new Date(sortedResult.data[i - 1].created_at);
    const currDate = new Date(sortedResult.data[i].created_at);
    TestValidator.predicate(
      "thumbnails should be sorted by created_at descending",
      prevDate >= currDate,
    );
  }
  // 10. Test pagination
  const page1Result =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          attachment_id: attachment.id,
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.predicate(
    "page 1 should return data",
    page1Result.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    page1Result.pagination.current === 1 &&
      page1Result.pagination.limit === 2 &&
      page1Result.pagination.records >= page1Result.data.length &&
      page1Result.pagination.pages >= 1,
  );
}
