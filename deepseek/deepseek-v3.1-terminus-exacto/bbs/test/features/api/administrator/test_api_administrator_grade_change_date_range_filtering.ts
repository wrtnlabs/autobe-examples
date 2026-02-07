import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

export async function test_api_administrator_grade_change_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123456",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Since we cannot create actual grade change records through the available API,
  // we'll test the search functionality with various date range scenarios
  // using the available search parameters
  // Test 1: Broad date range
  const broadRangeResult =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: promotionRequest.id, // Use the promotion request ID as a valid reference
        body: {
          created_at_start: new Date("2020-01-01T00:00:00Z").toISOString(),
          created_at_end: new Date("2030-12-31T23:59:59Z").toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(broadRangeResult);
  // Test 2: Narrow date range (likely empty)
  const narrowRangeResult =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: promotionRequest.id,
        body: {
          created_at_start: new Date("2025-01-01T00:00:00Z").toISOString(),
          created_at_end: new Date("2025-01-02T00:00:00Z").toISOString(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(narrowRangeResult);
  // Test 3: Date range with pagination
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: promotionRequest.id,
        body: {
          created_at_start: new Date("2020-01-01T00:00:00Z").toISOString(),
          created_at_end: new Date("2030-12-31T23:59:59Z").toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginatedResult.pagination.pages >= 0,
  );
  // Validate data structure consistency
  TestValidator.predicate("data is array", Array.isArray(paginatedResult.data));
  // Test that narrow range returns same or fewer records than broad range
  TestValidator.predicate(
    "narrow range has same or fewer records than broad range",
    narrowRangeResult.pagination.records <= broadRangeResult.pagination.records,
  );
  // Test search with specific grade filters
  const gradeFilterResult =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: promotionRequest.id,
        body: {
          old_grade: "regular",
          new_grade: "super",
          created_at_start: new Date("2020-01-01T00:00:00Z").toISOString(),
          created_at_end: new Date("2030-12-31T23:59:59Z").toISOString(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(gradeFilterResult);
  // Validate that all returned records have the expected structure
  if (broadRangeResult.data.length > 0) {
    const sampleRecord = broadRangeResult.data[0];
    TestValidator.predicate(
      "record has id",
      typeof sampleRecord.id === "string",
    );
    TestValidator.predicate(
      "record has old_grade",
      typeof sampleRecord.old_grade === "string",
    );
    TestValidator.predicate(
      "record has new_grade",
      typeof sampleRecord.new_grade === "string",
    );
    TestValidator.predicate(
      "record has reason",
      typeof sampleRecord.reason === "string",
    );
    TestValidator.predicate(
      "record has created_at",
      typeof sampleRecord.created_at === "string",
    );
    TestValidator.predicate(
      "record has administrator",
      typeof sampleRecord.administrator === "object",
    );
    TestValidator.predicate(
      "record has changedByAdministrator",
      typeof sampleRecord.changedByAdministrator === "object",
    );
  }
}
