import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test filtering administrator grade change audit records by transition type.
 *
 * This test validates the grade change audit trail filtering functionality:
 * 1. Authenticate as super administrator
 * 2. Filter for promotions (administrator → super_administrator)
 * 3. Filter for demotions (super_administrator → administrator)
 * 4. Validate that each filter returns only matching transition types
 */
export async function test_api_administrator_grade_change_filter_by_transition_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  // 2. Test promotion filter (administrator → super_administrator)
  const promotionFilter: IShoppingMallAdministratorGradeChange.IRequest = {
    previous_grade: "administrator",
    new_grade: "super_administrator",
    page: 1,
    limit: 20,
  };
  const promotionResults =
    await api.functional.shoppingMall.superAdministrator.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: promotionFilter,
      },
    );
  typia.assert(promotionResults);
  // Validate promotion results
  TestValidator.predicate(
    "promotion pagination exists",
    promotionResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "promotion data is array",
    Array.isArray(promotionResults.data),
  );
  // All promotion results should have correct grade transition
  for (const record of promotionResults.data) {
    TestValidator.equals(
      "promotion previous grade",
      record.previousGrade,
      "administrator",
    );
    TestValidator.equals(
      "promotion new grade",
      record.newGrade,
      "super_administrator",
    );
  }
  // 3. Test demotion filter (super_administrator → administrator)
  const demotionFilter: IShoppingMallAdministratorGradeChange.IRequest = {
    previous_grade: "super_administrator",
    new_grade: "administrator",
    page: 1,
    limit: 20,
  };
  const demotionResults =
    await api.functional.shoppingMall.superAdministrator.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: demotionFilter,
      },
    );
  typia.assert(demotionResults);
  // Validate demotion results
  TestValidator.predicate(
    "demotion pagination exists",
    demotionResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "demotion data is array",
    Array.isArray(demotionResults.data),
  );
  // All demotion results should have correct grade transition
  for (const record of demotionResults.data) {
    TestValidator.equals(
      "demotion previous grade",
      record.previousGrade,
      "super_administrator",
    );
    TestValidator.equals(
      "demotion new grade",
      record.newGrade,
      "administrator",
    );
  }
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "promotion current page >= 1",
    promotionResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "promotion limit >= 1",
    promotionResults.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "promotion records >= 0",
    promotionResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "promotion pages >= 0",
    promotionResults.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "demotion current page >= 1",
    demotionResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "demotion limit >= 1",
    demotionResults.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "demotion records >= 0",
    demotionResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "demotion pages >= 0",
    demotionResults.pagination.pages >= 0,
  );
}
