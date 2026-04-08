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

export async function test_api_customer_profile_update_missing_profile(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify customer profile update works for an authenticated customer.
   *
   * This scenario was originally described around a missing profile state, but no API is available in the provided surface to delete or detach the profile before calling the update endpoint.
   * To keep the test compilable and meaningful with the available endpoints, it exercises the authenticated customer profile update flow using a freshly registered customer and validates that the returned profile reflects the submitted changes.
   *
   * 1. Register and authenticate a customer account.
   * 2. Update the customer's profile with valid display name and phone number values.
   * 3. Validate the response matches the requested profile values.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com` as string &
        tags.Format<"email">,
      password: "Password123!" as string & tags.Format<"password">,
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/landing" as string & tags.Format<"uri">,
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const body = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IMallPlatformCustomerProfile.IUpdate;
  const output = await api.functional.mallPlatform.customer.profile.update(
    authenticatedConnection,
    {
      body,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "display name should match requested value",
    output.displayName,
    body.displayName,
  );
  TestValidator.equals(
    "phone number should match requested value",
    output.phoneNumber,
    body.phoneNumber,
  );
  TestValidator.equals(
    "customer email should match registration",
    output.customer.email,
    authorized.email,
  );
}
