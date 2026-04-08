import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminGradeTransition";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminGradeTransition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_grade_transition_audit_filter_by_target_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator to access grade transition audit logs
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a target administrator for grade transition filtering test
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(targetAdmin);
  // 3. Filter grade transitions by target administrator ID
  const filteredTransitions =
    await api.functional.ecommerce.admin.grade_transitions.index(
      adminConnection,
      {
        body: {
          ecommerce_admin_id: targetAdmin.id,
          page: 1,
          limit: 100,
        } satisfies IEcommerceAdminGradeTransition.IRequest,
      },
    );
  typia.assert(filteredTransitions);
  // 4. Validate all returned records belong to the target administrator
  TestValidator.equals(
    "all records belong to target admin",
    filteredTransitions.data.every(
      (record) => record.admin.id === targetAdmin.id,
    ),
    true,
  );
  // 5. Verify pagination metadata reflects filtered result count
  TestValidator.equals(
    "pagination records count matches data length",
    filteredTransitions.pagination.records,
    filteredTransitions.data.length,
  );
  // 6. Verify each record includes performedByAdmin showing who made each grade change
  // performedByAdmin is always present (not nullable) according to DTO definition
  TestValidator.predicate(
    "each record has performedByAdmin",
    filteredTransitions.data.every(
      (record) => record.performedByAdmin !== undefined,
    ),
  );
  // 7. Test with non-existent admin ID (should return empty results)
  const emptyResult =
    await api.functional.ecommerce.admin.grade_transitions.index(
      adminConnection,
      {
        body: {
          ecommerce_admin_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceAdminGradeTransition.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "non-existent admin returns empty data",
    emptyResult.data.length,
    0,
  );
  // 8. Verify empty result pagination metadata
  TestValidator.equals(
    "empty result pagination records is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages is 0",
    emptyResult.pagination.pages,
    0,
  );
}
