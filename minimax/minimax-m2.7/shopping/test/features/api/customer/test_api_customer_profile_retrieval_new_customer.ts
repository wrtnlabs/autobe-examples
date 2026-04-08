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

export async function test_api_customer_profile_retrieval_new_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer using the utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Get customer profile immediately after registration
  const profile =
    await api.functional.ecommerceMall.customer.customers.me.at(
      customerConnection,
    );
  typia.assert(profile);
  // 3. Validate account information
  // Account should be active (deleted_at is null for new accounts)
  TestValidator.equals("account is active", profile.deleted_at, null);
  // Customer ID should be present
  TestValidator.predicate(
    "has valid customer ID",
    profile.id !== undefined && profile.id.length > 0,
  );
  // Email should be present
  TestValidator.predicate(
    "has email",
    profile.email !== undefined && profile.email.length > 0,
  );
  // 4. Validate profile data
  // Display name should be present from registration
  TestValidator.predicate(
    "has display name",
    profile.profile !== undefined &&
      profile.profile.display_name !== undefined &&
      profile.profile.display_name.length > 0,
  );
  // Phone should be present (optional but check structure)
  TestValidator.predicate(
    "has phone field",
    profile.profile !== undefined && profile.profile.phone !== undefined,
  );
  // 5. Validate shipping addresses are empty for new customer
  TestValidator.equals(
    "shipping addresses empty for new customer",
    profile.shippingAddresses.length,
    0,
  );
  // 6. Validate cart is empty for new customer
  TestValidator.equals(
    "cart items empty for new customer",
    profile.cart.items.length,
    0,
  );
  TestValidator.equals(
    "cart total is 0 for new customer",
    profile.cart.total,
    0,
  );
  // 7. Validate wishlist structure for new customer
  // Wishlist should exist with proper structure
  TestValidator.predicate("wishlist exists", profile.wishlist !== undefined);
  // Validate wishlist has expected properties
  TestValidator.predicate(
    "wishlist has id",
    profile.wishlist !== null && profile.wishlist !== undefined,
  );
  // Validate wishlist items is empty (no products added yet)
  TestValidator.equals(
    "wishlist items empty for new customer",
    (profile.wishlist as any).items?.length ?? 0,
    0,
  );
}
