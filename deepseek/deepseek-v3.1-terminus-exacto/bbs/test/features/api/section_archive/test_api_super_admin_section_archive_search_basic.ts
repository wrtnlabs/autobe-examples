import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_archives_create } from "../../../generate/generate_random_discussion_board_admin_sections_archives_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_archive } from "../../../prepare/prepare_random_discussion_board_section_archive";

/**
 * Test the basic functionality of searching archived sections with default parameters.
 * Super admin logs in, performs archive search with minimal filters, verifies pagination
 * structure is correct, and checks that results include archival metadata and section
 * references. Validate response includes archived_at, reason, administrator reference,
 * and section summary information.
 */
export async function test_api_super_admin_section_archive_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin actor connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join and authorize super admin using utility function
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // Create admin actor connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join and authorize admin using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // Create test section as admin using utility function
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // Archive the section as admin using utility function
  const archiveReason = "Test archival for search functionality";
  const archivedSection =
    await generate_random_discussion_board_admin_sections_archives_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: { reason: archiveReason },
      },
    );
  typia.assert(archivedSection);
  // Test 1: Search with minimal filters (empty search)
  const emptySearchResults =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  // Validate pagination structure correctly
  TestValidator.predicate(
    "has pagination data",
    emptySearchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "has records array",
    Array.isArray(emptySearchResults.data),
  );
  // Navigate through the pagination structure
  // From DTO definitions: IPageIDiscussionBoardSectionArchive.ISummary has pagination of type IPageIDiscussionBoardSection.IPagination
  // IPageIDiscussionBoardSection.IPagination has pagination of type IPageIDiscussionBoardAdministratorPromotionRequest.IPagination
  // IPageIDiscussionBoardAdministratorPromotionRequest.IPagination has pagination of type IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination
  // IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination has pagination of type IPage.IPagination
  // IPage.IPagination has current, limit, records, pages properties
  // Access the final pagination object
  const finalPagination =
    emptySearchResults.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "pagination has current page",
    finalPagination.current,
    1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    finalPagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    finalPagination.pages >= 0,
  );
  TestValidator.predicate("limit is positive", finalPagination.limit > 0);
  // Test 2: Search with archival reason filter
  const reasonSearchResults =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          reason: "Test archival",
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(reasonSearchResults);
  // Validate that search returns relevant results
  if (reasonSearchResults.data.length > 0) {
    TestValidator.predicate(
      "found records match reason filter",
      reasonSearchResults.data.some((record) =>
        record.reason.includes("Test archival"),
      ),
    );
  }
  // Test 3: Search with specific administrator filter
  const adminSearchResults =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          archived_by: adminAuth.id,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(adminSearchResults);
  // Validate administrator reference in results
  if (adminSearchResults.data.length > 0) {
    TestValidator.predicate(
      "records have archival metadata",
      adminSearchResults.data.every(
        (record) =>
          record.archived_at &&
          record.reason &&
          record.archived_by &&
          record.section,
      ),
    );
    // Verify archival administrator matches
    TestValidator.predicate(
      "records match requested admin",
      adminSearchResults.data.some(
        (record) => record.archived_by.id === adminAuth.id,
      ),
    );
  }
  // Test 4: Search with pagination parameters
  const paginatedResults =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "archived_at_desc",
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Access pagination for paginated results
  const paginatedFinalPagination =
    paginatedResults.pagination.pagination.pagination.pagination;
  // Validate pagination limits work
  TestValidator.predicate(
    "data respects pagination limit",
    paginatedResults.data.length <= 5,
  );
  // Test 5: Validate archival metadata structure
  TestValidator.predicate(
    "section summary included",
    paginatedResults.data.every(
      (record) => record.section && record.section.id && record.section.name,
    ),
  );
  TestValidator.predicate(
    "admin summary included",
    paginatedResults.data.every(
      (record) =>
        record.archived_by &&
        record.archived_by.id &&
        record.archived_by.display_name,
    ),
  );
}
