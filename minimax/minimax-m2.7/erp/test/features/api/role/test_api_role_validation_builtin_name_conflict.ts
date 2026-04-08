import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_role_validation_builtin_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Test each built-in role name that should be rejected
  const builtinNames = ["owner", "manager", "employee"] as const;
  for (const builtinName of builtinNames) {
    const result = await api.functional.erpHrm.admin.roles.validate(
      adminConnection,
      {
        body: {
          name: builtinName,
        } satisfies IErpHrmRole.IValidationRequest,
      },
    );
    typia.assert(result);
    // 3. Verify validation fails with reserved name error
    TestValidator.equals(
      "isValid should be false for built-in name: " + builtinName,
      result.isValid,
      false,
    );
    TestValidator.predicate(
      "errors should contain reserved name message for: " + builtinName,
      result.errors.some((e) => e.toLowerCase().includes("reserved")),
    );
  }
}
