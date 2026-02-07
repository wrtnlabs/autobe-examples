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

export async function test_api_administrator_grade_change_history_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a valid administrator ID for testing
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  // Test search with basic parameters
  const searchResult =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: administratorId,
        body: {
          search: "promotion",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Test search with date range filtering
  const dateRangeSearch =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: administratorId,
        body: {
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test search with grade filtering
  const gradeFilterSearch =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: administratorId,
        body: {
          old_grade: "regular",
          new_grade: "super",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(gradeFilterSearch);
  // Test search with empty parameters (should return all records)
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: administratorId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Validate that search results contain expected fields when data exists
  if (searchResult.data.length > 0) {
    const firstResult = searchResult.data[0];
    TestValidator.predicate("has id", typeof firstResult.id === "string");
    TestValidator.predicate(
      "has old_grade",
      typeof firstResult.old_grade === "string",
    );
    TestValidator.predicate(
      "has new_grade",
      typeof firstResult.new_grade === "string",
    );
    TestValidator.predicate(
      "has reason",
      typeof firstResult.reason === "string",
    );
    TestValidator.predicate(
      "has created_at",
      typeof firstResult.created_at === "string",
    );
    TestValidator.predicate(
      "has administrator",
      typeof firstResult.administrator === "object",
    );
    TestValidator.predicate(
      "has changedByAdministrator",
      typeof firstResult.changedByAdministrator === "object",
    );
  }
  // Test pagination with different page sizes
  const smallPageSearch =
    await api.functional.discussionBoard.superAdmin.administrators.grade_changes.index(
      superAdminConnection,
      {
        administratorId: administratorId,
        body: {
          page: 2,
          limit: 3,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(smallPageSearch);
  TestValidator.equals(
    "small page current",
    smallPageSearch.pagination.current,
    2,
  );
  TestValidator.equals("small page limit", smallPageSearch.pagination.limit, 3);
}
