import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_seller_profile_customer_view_current_profile(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated customer can view the current public seller profile.
   *
   * Validates that the storefront profile endpoint returns the live seller profile
   * data used for customer-facing presentation, including the seller account
   * summary, shop identity fields, optional logo URI, and lifecycle timestamps.
   *
   * 1. Register an authenticated customer session.
   * 2. Request a seller profile using a UUID-shaped identifier.
   * 3. Validate the response shape when the profile is available.
   * 4. Confirm the endpoint is read-only by relying on the live DTO only, with no
   *    snapshot or edit metadata exposed in the response type.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!123",
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const sellerProfile =
    await api.functional.mallPlatform.customer.sellerProfiles.at(
      customerConnection,
      {
        sellerProfileId,
      },
    );
  typia.assert(sellerProfile);
  TestValidator.equals(
    "seller profile id matches request",
    sellerProfile.id,
    sellerProfileId,
  );
  TestValidator.predicate(
    "seller account summary is present",
    sellerProfile.sellerAccount.id.length > 0 &&
      sellerProfile.sellerAccount.email.length > 0,
  );
  TestValidator.predicate(
    "shop name is present",
    sellerProfile.shopName.length > 0,
  );
  TestValidator.predicate(
    "shop description is present",
    sellerProfile.shopDescription.length > 0,
  );
  TestValidator.predicate(
    "logo image uri is nullable or present",
    sellerProfile.logoImageUri === null ||
      sellerProfile.logoImageUri.length > 0,
  );
  TestValidator.predicate(
    "createdAt is present",
    sellerProfile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is present",
    sellerProfile.updatedAt.length > 0,
  );
  TestValidator.equals(
    "deletedAt is null for active profile",
    sellerProfile.deletedAt,
    null,
  );
}
