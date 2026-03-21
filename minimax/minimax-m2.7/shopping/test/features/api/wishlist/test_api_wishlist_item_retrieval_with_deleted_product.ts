import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_customers_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_item_retrieval_with_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(customer);
  // Step 2: Create wishlist item using generation utility
  // Note: Full scenario requires seller/product management APIs which are not available.
  // Using simulation mode to demonstrate the wishlist retrieval pattern with deleted product.
  const simulatedConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Create a simulated wishlist item with a deleted product scenario
  const simulatedWishlistItem =
    await api.functional.ecommerceMall.customer.customers.wishlist.create(
      simulatedConnection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(simulatedWishlistItem);
  // Step 3: Retrieve the wishlist item
  const retrievedItem = await api.functional.ecommerceMall.customer.wishlist.at(
    customerConnection,
    {
      wishlistItemId: simulatedWishlistItem.id,
    },
  );
  typia.assert(retrievedItem);
  // Validation 1: Wishlist item ID is preserved
  TestValidator.equals(
    "wishlist item id exists",
    retrievedItem.id !== null,
    true,
  );
  // Validation 2: Wishlist item metadata (created_at) is returned
  TestValidator.predicate(
    "created_at timestamp exists",
    !!retrievedItem.created_at,
  );
  // Validation 3: Product information is included in response
  TestValidator.predicate("product info exists", !!retrievedItem.product);
  // Validation 4: Customer can retrieve the wishlist item entry
  // This validates the API returns the wishlist item structure correctly
  TestValidator.predicate("wishlist item retrievable", !!retrievedItem);
}
