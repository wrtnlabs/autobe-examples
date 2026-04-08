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
 * Test customer profile update preserves owner scope and account identity.
 *
 * Verifies that an authenticated customer can update only their own profile
 * fields and that the response still references the same owning customer
 * account. The test focuses on the narrow edit contract for the profile update
 * endpoint and checks that account-level identity data remains unchanged while
 * display name and phone number are updated.
 *
 * 1. Register a new customer and retain the authorized account response.
 * 2. Use the authenticated customer connection to update the profile.
 * 3. Validate that ownership, account identity, and editable profile fields are correct.
 */
export async function test_api_customer_profile_update_owner_scope(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email: string = `customer.${RandomGenerator.alphabets(8)}@example.com`;
  const password: string = `Pw${RandomGenerator.alphaNumeric(10)}!`;
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const originalProfile = joined.profile;
  TestValidator.predicate(
    "joined customer should expose profile for owner-scoped update",
    originalProfile !== undefined,
  );
  if (originalProfile === undefined) return;
  const updatedDisplayName = RandomGenerator.name();
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updatedProfile =
    await api.functional.mallPlatform.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: updatedDisplayName,
          phoneNumber: updatedPhoneNumber,
        } satisfies IMallPlatformCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "customer profile id preserved",
    updatedProfile.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "customer ownership preserved",
    updatedProfile.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "customer ownership email preserved",
    updatedProfile.customer.email,
    joined.email,
  );
  TestValidator.equals(
    "customer account status preserved",
    updatedProfile.customer.status,
    joined.status,
  );
  TestValidator.equals(
    "customer account created_at preserved",
    updatedProfile.customer.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "customer account deleted_at preserved",
    updatedProfile.customer.deleted_at,
    joined.deleted_at,
  );
  TestValidator.equals(
    "display name updated",
    updatedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phoneNumber,
    updatedPhoneNumber,
  );
}
