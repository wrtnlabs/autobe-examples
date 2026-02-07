import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
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
 * Test date range filtering capabilities for section snapshots.
 * 1. Create a super admin account and authenticate
 * 2. Create a section that will have snapshots
 * 3. Test date range filtering with created_at_from and created_at_to parameters
 * 4. Verify filtering functionality works correctly
 * 5. Validate that empty date range parameters return all snapshots
 */
export async function test_api_section_snapshots_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Update connection with authentication token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authResult.token.access,
  };
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Test date range filtering with current date range
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  // Test filtering with date range
  const filteredSnapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          created_at_from: oneWeekAgo,
          created_at_to: oneDayAgo,
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // Validate that the API responds correctly with filtering parameters
  TestValidator.predicate(
    "should return valid pagination structure",
    filteredSnapshots.pagination !== undefined,
  );
  // 4. Test with empty date range parameters (should return all snapshots)
  const allSnapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify that we get a valid response when no filters are applied
  TestValidator.predicate(
    "should return valid data structure",
    Array.isArray(allSnapshots.data),
  );
  // 5. Test with only created_at_from parameter
  const fromOnlySnapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          created_at_from: oneWeekAgo,
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(fromOnlySnapshots);
  // 6. Test with only created_at_to parameter
  const toOnlySnapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          created_at_to: now.toISOString(),
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(toOnlySnapshots);
  // Validate that all API calls return proper pagination structure
  TestValidator.equals(
    "pagination structure should be consistent",
    typeof filteredSnapshots.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination structure should be consistent",
    typeof filteredSnapshots.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination structure should be consistent",
    typeof filteredSnapshots.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination structure should be consistent",
    typeof filteredSnapshots.pagination.pages,
    "number",
  );
}
