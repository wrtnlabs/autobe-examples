import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test retrieval of an administrator grade change audit record.
 *
 * A super administrator authenticates and retrieves a grade change record by its UUID.
 * The test validates that the grade change record structure is correct through typia.assert():
 * - Contains id, administrator, superAdministrator, previousGrade, newGrade, reason, and createdAt
 * - previousGrade and newGrade are valid enum values ('administrator' or 'super_administrator')
 * - administrator and superAdministrator contain valid ISummary objects with all required fields
 * - All format validations (UUID, email, date-time) are enforced
 *
 * This ensures the audit trail endpoint correctly returns grade change records
 * for compliance and oversight purposes.
 */
export async function test_api_administrator_grade_change_demotion_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(authResult);
  // 2. Retrieve grade change record by UUID
  const gradeChange =
    await api.functional.shoppingMall.superAdministrator.administrator_grade_changes.at(
      superAdminConnection,
      {
        changeId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(gradeChange);
}
