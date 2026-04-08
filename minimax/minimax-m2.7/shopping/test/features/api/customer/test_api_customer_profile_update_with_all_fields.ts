import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
 * Test successful seller profile update with all valid fields.
 *
 * Validates the complete seller profile update workflow including customer authentication, profile modification with all fields (name, description, logo_uri), and response validation. Ensures that the profile correctly stores all provided values and that timestamps are properly managed.
 *
 * The test verifies:
 * - Customer can authenticate via join endpoint
 * - Profile update accepts all valid fields (name, description, logo_uri)
 * - Response contains the updated profile with correct values
 * - Seller relationship is properly included in response
 * - Timestamps (created_at, updated_at) are present and valid
 *
 * 1. Customer registers via join to obtain authentication credentials
 * 2. Customer sends PUT request to /ecommerceMall/customer/profile with all profile fields
 * 3. Validates HTTP 200 response and response body contains updated values
 * 4. Validates seller relationship exists in response
 * 5. Validates timestamp fields are present and updated_at is newer than created_at
 */
export async function test_api_customer_profile_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Prepare profile update data with all fields
  const updateBody: IEcommerceMallSellerProfile.IUpdate = {
    name: "My Shop Name",
    description: "A great shop selling quality products",
    logoUri: "https://example.com/logo.png",
  };
  // 3. Update seller profile with all fields
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // 4. Validate response contains updated profile with correct values
  TestValidator.equals("name matches", updatedProfile.name, updateBody.name);
  TestValidator.equals(
    "description matches",
    updatedProfile.description,
    updateBody.description,
  );
  TestValidator.equals(
    "logo_uri matches",
    updatedProfile.logo_uri,
    updateBody.logoUri,
  );
  // 5. Validate seller relationship is included in response
  TestValidator.predicate(
    "seller relationship exists",
    updatedProfile.seller !== undefined,
  );
  // 6. Validate timestamps are present and updated_at is newer than created_at
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedProfile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedProfile.updated_at),
  );
  const createdAtTime = new Date(updatedProfile.created_at).getTime();
  const updatedAtTime = new Date(updatedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedAtTime >= createdAtTime,
  );
}
