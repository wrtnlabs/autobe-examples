import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_invalid_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Reject invalid customer refresh tokens.
   *
   * Verifies that a signed-in customer can attempt token renewal, but a refresh
   * token that is structurally valid and not part of the active session lifecycle
   * is rejected by the refresh endpoint.
   *
   * 1. Create a legitimate customer session through customer registration.
   * 2. Submit a refresh request using an unusable refresh token value.
   * 3. Confirm the server rejects the request with an authentication error.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(registered);
  await TestValidator.httpError(
    "customer refresh should reject invalid refresh token",
    [401, 403],
    async () => {
      await authorize_customer_refresh(customerConnection, {
        body: {
          refreshToken: typia.random<string & tags.Format<"password">>(),
        } satisfies IMallPlatformCustomer.IRefresh,
      });
    },
  );
}
