import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionDeletion";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_deletion_audit_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create regular admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create sections that will be deleted at different timestamps
  const sections: IDiscussionBoardSection[] = [];
  for (let i = 0; i < 3; i++) {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }
  // Perform deletions and record timestamps
  const deletionTimestamps: string[] = [];
  // First deletion
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: sections[0].id,
  });
  const timestamp1 = new Date().toISOString();
  deletionTimestamps.push(timestamp1);
  // Second deletion with slight time offset
  const timestamp2 = new Date(Date.now() + 1000).toISOString(); // 1 second later
  deletionTimestamps.push(timestamp2);
  // Third deletion with further time offset
  const timestamp3 = new Date(Date.now() + 2000).toISOString(); // 2 seconds later
  deletionTimestamps.push(timestamp3);
  // Perform remaining deletions
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: sections[1].id,
  });
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: sections[2].id,
  });
  // Test 1: Filter by exact date range (start and end)
  const result1 =
    await api.functional.discussionBoard.superAdmin.sections.deletions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: deletionTimestamps[0],
          created_at_end: deletionTimestamps[2],
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(result1);
  // Should include all 3 deletions
  TestValidator.equals(
    "exact range should include all records",
    result1.data.length,
    3,
  );
  // Test 2: Filter by start date only (all records after start)
  const result2 =
    await api.functional.discussionBoard.superAdmin.sections.deletions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: deletionTimestamps[1],
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(result2);
  // Should include last 2 deletions
  TestValidator.equals(
    "start date only should include records after",
    result2.data.length,
    2,
  );
  // Test 3: Filter by end date only (all records before end)
  const result3 =
    await api.functional.discussionBoard.superAdmin.sections.deletions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_end: deletionTimestamps[1],
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(result3);
  // Should include first 2 deletions
  TestValidator.equals(
    "end date only should include records before",
    result3.data.length,
    2,
  );
  // Test 4: Filter with overlapping date range
  const result4 =
    await api.functional.discussionBoard.superAdmin.sections.deletions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: deletionTimestamps[0],
          created_at_end: deletionTimestamps[1],
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(result4);
  // Should include first 2 deletions
  TestValidator.equals(
    "overlapping range should include matching records",
    result4.data.length,
    2,
  );
  // Test 5: Empty date range (no records should match)
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const result5 =
    await api.functional.discussionBoard.superAdmin.sections.deletions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: futureDate,
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(result5);
  // Should return empty array
  TestValidator.equals(
    "future date range should return empty",
    result5.data.length,
    0,
  );
  // Validate chronological ordering
  for (let i = 1; i < result1.data.length; i++) {
    const current = new Date(result1.data[i].created_at);
    const previous = new Date(result1.data[i - 1].created_at);
    TestValidator.predicate(
      "records should be in chronological order",
      current >= previous,
    );
  }
  // Additional validation: verify timestamps are within expected ranges
  result1.data.forEach((record, index) => {
    const recordDate = new Date(record.created_at);
    const expectedMin = new Date(deletionTimestamps[0]);
    const expectedMax = new Date(deletionTimestamps[2]);
    TestValidator.predicate(
      `record ${index} timestamp should be within range`,
      recordDate >= expectedMin && recordDate <= expectedMax,
    );
  });
}
