import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_grade_changes_search_by_target_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test search with administrator_id filter
  const searchResult =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          administrator_id: null, // Search all administrators (no filter)
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata - navigate through nested pagination structure
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    searchResult.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Validate record structure for any returned data
  for (const record of searchResult.data) {
    TestValidator.predicate("has valid id", record.id.length > 0);
    TestValidator.predicate("has old grade", record.old_grade.length > 0);
    TestValidator.predicate("has new grade", record.new_grade.length > 0);
    TestValidator.predicate("has reason", record.reason.length > 0);
    TestValidator.predicate(
      "has valid timestamp",
      new Date(record.created_at).getTime() > 0,
    );
    TestValidator.equals(
      "administrator exists",
      typeof record.administrator.id,
      "string",
    );
    TestValidator.equals(
      "changed by administrator exists",
      typeof record.changed_by_administrator.id,
      "string",
    );
  }
  // Test search with different pagination parameters
  const searchResultPage2 =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          administrator_id: null,
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResultPage2);
  TestValidator.equals(
    "page 2 current page",
    searchResultPage2.pagination.pagination.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit",
    searchResultPage2.pagination.pagination.pagination.pagination.limit,
    5,
  );
}
