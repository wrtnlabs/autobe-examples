import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_suspend_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create a seller account (approved and active) - using random seller ID
  // Note: No SDK function available for seller creation, so we assume an existing seller
  // and test suspension on it with a random UUID
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call suspend endpoint with suspension reason
  const suspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.suspend.suspendSeller(
      adminConnection,
      {
        sellerId,
        body: {
          reason: "Violation of marketplace terms and conditions",
        } satisfies IEcommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspendedSeller);
  // 4. Validate response has is_suspended set to true
  TestValidator.equals(
    "seller is suspended",
    suspendedSeller.is_suspended,
    true,
  );
  // 5. Verify seller cannot create products while suspended
  // Note: No SDK function available for product operations, skipping this validation
}
