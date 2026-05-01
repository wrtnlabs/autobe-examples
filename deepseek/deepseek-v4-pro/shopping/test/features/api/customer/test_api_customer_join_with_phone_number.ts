import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer registration including the optional phone_number field.
 *
 * Validates that a customer can self-register with a phone number alongside required fields (email, display_name) and that the optional phone_number is properly persisted and returned in the authentication response.
 *
 * 1. Generate a unique email, display name, and Korean-format phone number.
 * 2. Register the customer via authorize_customer_join with the generated data.
 * 3. Validate the full IAuthorized response structure with typia.assert.
 * 4. Verify phone_number matches the submitted value exactly (not null).
 * 5. Verify email and display_name are preserved in the response.
 * 6. Verify banned_at and deleted_at are null for a newly registered account.
 */
export async function test_api_customer_join_with_phone_number(
  connection: api.IConnection,
): Promise<void> {
  const phoneNumber = RandomGenerator.mobile();
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      display_name: displayName,
      phone_number: phoneNumber,
    },
  });
  typia.assert(authorized);
  TestValidator.equals(
    "phone_number matches submitted value",
    authorized.phone_number,
    phoneNumber,
  );
  TestValidator.equals(
    "email matches submitted value",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "display_name matches submitted value",
    authorized.display_name,
    displayName,
  );
  TestValidator.equals(
    "banned_at is null for new account",
    authorized.banned_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deleted_at,
    null,
  );
}
