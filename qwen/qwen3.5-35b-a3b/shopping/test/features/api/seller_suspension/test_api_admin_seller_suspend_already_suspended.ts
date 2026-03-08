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

export async function test_api_admin_seller_suspend_already_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create new connection with admin token for subsequent calls
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: admin.token.access,
    },
  };
  // 3. Generate seller ID and perform first suspension
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const firstSuspension =
    await api.functional.ecommerceMall.admin.sellers.suspend.suspendSeller(
      adminAuthenticatedConnection,
      {
        sellerId,
        body: {
          reason: "Initial suspension for testing",
        },
      },
    );
  typia.assert(firstSuspension);
  TestValidator.equals(
    "first suspension - seller suspended",
    firstSuspension.is_suspended,
    true,
  );
  // 4. Attempt second suspension with different reason
  // This should fail with a validation error since seller is already suspended
  await TestValidator.httpError(
    "second suspension - should fail for already suspended seller",
    400,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.suspend.suspendSeller(
        adminAuthenticatedConnection,
        {
          sellerId,
          body: {
            reason: "Duplicate suspension attempt",
          },
        },
      );
    },
  );
  // 5. State verification is implicitly handled by the httpError validation
  // The error response confirms the seller is already suspended
}
