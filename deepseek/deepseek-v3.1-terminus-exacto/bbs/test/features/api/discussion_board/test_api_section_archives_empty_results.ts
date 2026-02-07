import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the search functionality when no archives exist for a section.
 * Create a section but do not archive it. Perform a search for archives
 * associated with this section and verify that the response contains empty
 * data array with proper pagination metadata (records: 0, pages: 0).
 * This validates the system handles empty result sets correctly without errors.
 */
export async function test_api_section_archives_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "test-super-admin@example.com",
      password: "test-password-123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a new section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Test Section for Empty Archives",
          description:
            "This section is created to test empty archive search results",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Search archives for the created section
  const archivesResponse =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(archivesResponse);
  // 4. Verify empty data array
  TestValidator.equals("data array should be empty", archivesResponse.data, []);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "records should be 0",
    archivesResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0",
    archivesResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page should be valid",
    archivesResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be valid",
    archivesResponse.pagination.limit > 0,
  );
}
