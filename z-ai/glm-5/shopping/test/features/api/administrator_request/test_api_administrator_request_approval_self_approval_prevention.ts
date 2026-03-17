import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_approval_self_approval_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Test that the approve endpoint enforces super admin authorization
  //
  // Note: Full self-approval prevention testing requires:
  // 1. API to create administrator requests
  // 2. API to retrieve request details for verification
  // 3. Mechanism to link an administrator request to the approver
  //
  // Since these APIs are not available, we test the authorization layer:
  // A regular admin (grade='regular') should receive 403 Forbidden
  // when attempting to approve any administrator request.
  // This validates the first authorization check before self-approval
  // prevention logic would be evaluated.
  // 1. Create a regular administrator account (grade defaults to 'regular')
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularAdmin);
  // Verify the admin was created with 'regular' grade
  TestValidator.equals("admin grade is regular", regularAdmin.grade, "regular");
  // 2. Attempt to approve an administrator request as a regular admin
  // Should fail with 403 Forbidden - only super admins can approve requests
  const randomRequestUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "regular admin cannot approve administrator requests",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.approve(
        regularAdminConnection,
        {
          administratorRequestId: randomRequestUuid,
        },
      );
    },
  );
}
