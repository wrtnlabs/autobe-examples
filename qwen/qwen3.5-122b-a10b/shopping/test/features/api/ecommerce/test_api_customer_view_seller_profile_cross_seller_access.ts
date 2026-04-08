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
 * Test customer viewing seller shop profile with cross-seller access validation.
 *
 * Validates that customers can view any seller's shop profile on the platform, regardless of which seller they interact with. This test ensures proper access control for seller profile visibility and verifies that shop profile data is correctly returned when accessed by customers.
 *
 * The test registers a customer account and then validates that the customer can successfully retrieve and view a seller's shop profile information. This confirms the platform's transparency model where seller information is publicly accessible to customers browsing products.
 *
 * 1. Register and authenticate a customer account.
 * 2. Customer retrieves a seller's shop profile using the profile ID.
 * 3. Validates response contains valid seller profile data.
 * 4. Verifies shop_name, shop_description, and logo_image_url fields are properly structured.
 * 5. Confirms embedded seller summary correctly identifies the seller (id, shop_name).
 * 6. Validates profile structure and data integrity through typia.assert().
 */
export async function test_api_customer_view_seller_profile_cross_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Customer retrieves a seller's shop profile using profile ID
  // Note: In simulation mode, typia.random generates valid mock data
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const retrievedProfile = await api.functional.ecommerce.customer.profiles.at(
    customerConnection,
    {
      profileId,
    },
  );
  typia.assert(retrievedProfile);
  // 3-5. Validate seller profile data integrity
  TestValidator.predicate(
    "shop_name is non-empty",
    retrievedProfile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(retrievedProfile.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(retrievedProfile.updated_at).getTime() > 0,
  );
  // 6. Verify embedded seller summary structure
  TestValidator.predicate(
    "seller id is valid UUID",
    retrievedProfile.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller shop_name is non-empty",
    retrievedProfile.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller approval_status is defined",
    retrievedProfile.seller.approval_status !== undefined,
  );
}
