import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import type { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentCategoryMapping";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_admin_attachment_categories_create";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";

/**
 * Test targeted filtering by attachment ID and category ID.
 * As a super administrator, authenticate and test the search functionality
 * with various filter combinations. Focus on validating that the search
 * respects filtering parameters and returns appropriate results based on
 * existing data in the system.
 */
export async function test_api_attachment_category_mappings_specific_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Search for all existing mappings to get baseline data
  const allMappings =
    await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(allMappings);
  // 3. Test filtering by invalid attachment_id (non-existent)
  const invalidAttachment =
    await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
      superAdminConnection,
      {
        body: {
          attachment_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(invalidAttachment);
  TestValidator.equals(
    "invalid attachment filter returns empty",
    invalidAttachment.data.length,
    0,
  );
  // 4. Test filtering by invalid category_id (non-existent)
  const invalidCategory =
    await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
      superAdminConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(invalidCategory);
  TestValidator.equals(
    "invalid category filter returns empty",
    invalidCategory.data.length,
    0,
  );
  // 5. Test pagination functionality
  const paginated =
    await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(paginated);
  // Verify pagination metadata is present regardless of data
  TestValidator.predicate(
    "pagination metadata present",
    typeof paginated.pagination.limit === "number" &&
      typeof paginated.pagination.current === "number" &&
      typeof paginated.pagination.records === "number" &&
      typeof paginated.pagination.pages === "number",
  );
  // 6. If there are existing mappings, test more specific filtering
  if (allMappings.data.length > 0) {
    const firstMapping = allMappings.data[0];
    const attachmentId = firstMapping.attachment.id;
    const categoryId = firstMapping.category.id;
    // Test filtering by attachment_id only
    const byAttachment =
      await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
        superAdminConnection,
        {
          body: {
            attachment_id: attachmentId,
            page: 1,
            limit: 100,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
        },
      );
    typia.assert(byAttachment);
    TestValidator.predicate(
      "attachment filter returns correct mappings",
      byAttachment.data.every(
        (mapping) => mapping.attachment.id === attachmentId,
      ),
    );
    // Test filtering by category_id only
    const byCategory =
      await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
        superAdminConnection,
        {
          body: {
            category_id: categoryId,
            page: 1,
            limit: 100,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
        },
      );
    typia.assert(byCategory);
    TestValidator.predicate(
      "category filter returns correct mappings",
      byCategory.data.every((mapping) => mapping.category.id === categoryId),
    );
    // Test filtering by both attachment_id and category_id
    const byBoth =
      await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
        superAdminConnection,
        {
          body: {
            attachment_id: attachmentId,
            category_id: categoryId,
            page: 1,
            limit: 100,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
        },
      );
    typia.assert(byBoth);
    TestValidator.predicate(
      "combined filter returns correct mappings",
      byBoth.data.every(
        (mapping) =>
          mapping.attachment.id === attachmentId &&
          mapping.category.id === categoryId,
      ),
    );
    // Test date range filtering
    const recentMappings =
      await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
        superAdminConnection,
        {
          body: {
            created_at_start: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            created_at_end: new Date().toISOString(),
            page: 1,
            limit: 100,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
        },
      );
    typia.assert(recentMappings);
  }
}
