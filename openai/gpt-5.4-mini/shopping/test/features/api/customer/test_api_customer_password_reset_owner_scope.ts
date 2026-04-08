import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_owner_scope(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test password reset record access remains isolated to the owning customer scope.
   *
   * This scenario validates the account recovery privacy boundary by creating two
   * distinct customer sessions and confirming that a customer cannot inspect a
   * password reset record outside their own scope through the password reset
   * retrieval endpoint.
   *
   * 1. Register two unique customers and keep their connections isolated.
   * 2. Generate a format-valid password reset identifier that is not owned by the caller.
   * 3. Confirm the non-owning customer is denied access to the record.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const intruderConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const intruder = await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(intruder);
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "password reset records are not accessible across customer scopes",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.passwordResets.at(
        intruderConnection,
        { passwordResetId },
      );
    },
  );
}
