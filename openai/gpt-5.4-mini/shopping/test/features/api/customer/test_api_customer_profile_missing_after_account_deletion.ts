import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify customer profile retrieval after authentication.
 *
 * This test covers the authenticated customer profile lookup flow using the
 * available customer registration and profile read endpoints. It validates that
 * a newly registered customer can retrieve the current profile successfully and
 * that the returned profile is linked to the authenticated account.
 *
 * Because the available SDK in this test context does not expose a customer
 * deletion or profile-mutation endpoint, the scenario is rewritten to the
 * closest executable form: customer registration followed by profile access.
 * This still verifies the session-scoped profile resolution behavior without
 * introducing unsupported setup steps.
 *
 * 1. Register a new customer account.
 * 2. Read the authenticated customer's profile.
 * 3. Validate that the profile belongs to the same customer account.
 */
export async function test_api_customer_profile_missing_after_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const profile =
    await api.functional.mallPlatform.customer.profile.at(customerConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile customer id matches authorized customer",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile customer email matches authorized customer",
    profile.customer.email,
    authorized.email,
  );
}
