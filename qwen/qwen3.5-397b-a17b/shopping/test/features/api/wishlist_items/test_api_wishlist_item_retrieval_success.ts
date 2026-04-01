import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_items_create";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test the primary success path for retrieving a specific wishlist item.
 *
 * Test workflow:
 * 1. Create a new customer account using authorize_customer_join utility
 * 2. Create customer-specific connection with authentication token
 * 3. Add a product to customer's wishlist using utility function
 * 4. Retrieve the specific wishlist item by ID
 * 5. Validate response contains complete wishlist item details
 * 6. Verify product and customer information matches
 */
export async function test_api_wishlist_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authenticate
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection with auth token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 3. Add a product to customer's wishlist
  const wishlistItem =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      {},
    );
  typia.assert(wishlistItem);
  // 4. Retrieve the specific wishlist item by ID
  const retrievedItem =
    await api.functional.shoppingMall.customer.wishlist_items.at(
      customerConnection,
      {
        wishlistItemId: wishlistItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 5. Validate wishlist item structure and content
  TestValidator.equals(
    "wishlist item ID matches",
    retrievedItem.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedItem.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedItem.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "deleted_at is null for active item",
    retrievedItem.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedItem.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedItem.updated_at !== null,
  );
  // 6. Validate customer profile information exists and has required fields
  typia.assertGuard(retrievedItem.customer.profile!);
  TestValidator.predicate(
    "profile has display name",
    retrievedItem.customer.profile!.displayName.length > 0,
  );
  TestValidator.predicate(
    "profile has phone number",
    retrievedItem.customer.profile!.phoneNumber.length > 0,
  );
  // 7. Validate product information (ISummary type has limited fields)
  TestValidator.predicate(
    "product exists",
    retrievedItem.product !== null,
  );
  // 8. Validate timestamps are in correct order
  TestValidator.predicate(
    "updated_at >= created_at",
    new Date(retrievedItem.updated_at) >= new Date(retrievedItem.created_at),
  );
}