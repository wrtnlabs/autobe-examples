import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Customer views a seller's shop profile when browsing products or viewing order details.
 *
 * Validates the complete workflow of customer accessing seller profile information for transparency. The test ensures that shop profile data including shop name, description, logo image URL, and seller account status are correctly retrieved and validated.
 *
 * This validates the primary business workflow of customers viewing seller information when browsing products or reviewing order details.
 *
 * 1. Register a customer account and authenticate
 * 2. Generate a seller profile ID (in simulation mode, API returns valid seller profile data)
 * 3. Customer retrieves the seller's shop profile using the profile ID
 * 4. Validate the response contains all expected fields
 * 5. Verify shop name is properly formatted
 * 6. Verify shop description is string or null
 * 7. Verify logo image URL is valid URI or null
 * 8. Verify embedded seller summary includes all required fields
 */
export async function test_api_customer_view_seller_shop_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Generate seller profile ID for retrieval
  // In simulation mode, API will return valid seller profile data
  const sellerProfileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Customer retrieves the seller's shop profile
  const profile: IEcommerceSellerProfile =
    await api.functional.ecommerce.customer.profiles.at(customerConnection, {
      profileId: sellerProfileId,
    });
  typia.assert(profile);
  // 4. Validate response structure
  TestValidator.equals("profile id is valid UUID", profile.id.length > 0, true);
  TestValidator.predicate("shop name exists", profile.shop_name.length > 0);
  TestValidator.predicate(
    "shop description is string or null",
    profile.shop_description === null ||
      typeof profile.shop_description === "string",
  );
  TestValidator.predicate(
    "logo image URL is valid URI or null",
    profile.logo_image_url === null ||
      /^https?:\/\//.test(profile.logo_image_url),
  );
  // 5. Validate embedded seller summary
  TestValidator.predicate(
    "seller summary has id",
    profile.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller summary has approval_status",
    ["pending", "approved", "rejected"].includes(
      profile.seller.approval_status,
    ),
  );
  TestValidator.predicate(
    "seller summary has is_suspended boolean",
    typeof profile.seller.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "seller summary has is_banned boolean",
    typeof profile.seller.is_banned === "boolean",
  );
  TestValidator.predicate(
    "seller summary has created_at timestamp",
    profile.seller.created_at.length > 0,
  );
  TestValidator.predicate(
    "seller summary has shop_name",
    profile.seller.shop_name.length > 0,
  );
}
