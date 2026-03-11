import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionDeletion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_deletion_audit_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create multiple test sections
  const sections = await ArrayUtil.asyncRepeat(3, async () => {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    return section;
  });
  // Delete sections to generate audit records
  const deletionTimestamps: string[] = [];
  // Delete first section immediately
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: sections[0].id,
  });
  deletionTimestamps.push(new Date().toISOString());
  // Wait a moment for timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Delete second section
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: sections[1].id,
  });
  deletionTimestamps.push(new Date().toISOString());
  // Wait a moment for timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Delete third section
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: sections[2].id,
  });
  deletionTimestamps.push(new Date().toISOString());
  // Test 1: Filter by date range that includes all deletions
  const allDeletionsResponse =
    await api.functional.discussionBoard.admin.sections.deletions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: deletionTimestamps[0],
          created_at_end: deletionTimestamps[2],
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(allDeletionsResponse);
  TestValidator.equals(
    "all deletions within range",
    allDeletionsResponse.data.length,
    3,
  );
  TestValidator.equals(
    "pagination total records",
    allDeletionsResponse.pagination.records,
    3,
  );
  // Test 2: Filter by narrow date range (middle deletion only)
  const middleDeletionResponse =
    await api.functional.discussionBoard.admin.sections.deletions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: deletionTimestamps[1],
          created_at_end: deletionTimestamps[1],
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(middleDeletionResponse);
  TestValidator.equals(
    "single deletion within range",
    middleDeletionResponse.data.length,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    middleDeletionResponse.pagination.records,
    1,
  );
  // Test 3: Filter by date range with no matching records
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const noMatchesResponse =
    await api.functional.discussionBoard.admin.sections.deletions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: futureDate,
          created_at_end: futureDate,
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(noMatchesResponse);
  TestValidator.equals(
    "no deletions in future range",
    noMatchesResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination total records",
    noMatchesResponse.pagination.records,
    0,
  );
  // Test 4: Filter with null date parameters (should return all records)
  const nullDateResponse =
    await api.functional.discussionBoard.admin.sections.deletions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: null,
          created_at_end: null,
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(nullDateResponse);
  TestValidator.equals(
    "null dates return all records",
    nullDateResponse.data.length,
    3,
  );
  TestValidator.equals(
    "pagination total records",
    nullDateResponse.pagination.records,
    3,
  );
  // Test 5: Filter by partial date range (only start date)
  const startOnlyResponse =
    await api.functional.discussionBoard.admin.sections.deletions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: deletionTimestamps[0],
          created_at_end: null,
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(startOnlyResponse);
  TestValidator.equals(
    "start date only filter",
    startOnlyResponse.data.length,
    3,
  );
  TestValidator.equals(
    "pagination total records",
    startOnlyResponse.pagination.records,
    3,
  );
  // Test 6: Filter by partial date range (only end date)
  const endOnlyResponse =
    await api.functional.discussionBoard.admin.sections.deletions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: null,
          created_at_end: deletionTimestamps[2],
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(endOnlyResponse);
  TestValidator.equals("end date only filter", endOnlyResponse.data.length, 3);
  TestValidator.equals(
    "pagination total records",
    endOnlyResponse.pagination.records,
    3,
  );
  // Test 7: Pagination with date filtering
  const paginationResponse =
    await api.functional.discussionBoard.admin.sections.deletions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
          created_at_start: deletionTimestamps[0],
          created_at_end: deletionTimestamps[2],
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination limit works",
    paginationResponse.data.length,
    2,
  );
  TestValidator.equals(
    "pagination total records correct",
    paginationResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages calculated",
    paginationResponse.pagination.pages,
    2,
  );
}
