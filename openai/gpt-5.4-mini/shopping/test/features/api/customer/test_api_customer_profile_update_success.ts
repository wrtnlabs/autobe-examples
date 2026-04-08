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
 * Test signed-in customer profile update success.
 *
 * Validates that an authenticated customer can update only their own profile
 * information through the profile endpoint. The test checks that display name
 * and phone number changes are persisted in the returned profile payload, and
 * confirms unrelated account data such as email and ownership metadata remain
 * intact.
 *
 * 1. Register a new customer and create an isolated authenticated connection.
 * 2. Submit a profile update with a new display name and phone number.
 * 3. Validate the response matches the updated profile values and preserves
 *    unrelated account fields.
 */
export async function test_api_customer_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  const signupConnection: api.IConnection = { host: connection.host };
  const join = await authorize_customer_join(signupConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: `https://example.com/signup/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(join);
  TestValidator.predicate(
    "customer has profile after join",
    join.profile !== undefined,
  );
  if (join.profile === undefined) return;
  const profileConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: join.token.access },
  };
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const output = await api.functional.mallPlatform.customer.profile.update(
    profileConnection,
    {
      body: {
        displayName: newDisplayName,
        phoneNumber: newPhoneNumber,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "display name updated",
    output.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    output.phoneNumber,
    newPhoneNumber,
  );
  TestValidator.equals(
    "profile owner email preserved",
    output.customer.email,
    join.email,
  );
  TestValidator.equals(
    "profile owner id preserved",
    output.customer.id,
    join.id,
  );
  TestValidator.equals(
    "customer status preserved",
    output.customer.status,
    join.status,
  );
  TestValidator.equals(
    "customer deleted_at preserved",
    output.customer.deleted_at,
    join.deleted_at,
  );
}
