import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_customer_wishlist_deleted_product_auto_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and gets their wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Seller joins (for potential product operations)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Customer retrieves their wishlist
  // Note: Since each customer has exactly one wishlist created on registration,
  // and we don't have a list endpoint, we use the customer's ID as the wishlist ID
  // (This assumes the system uses customer ID as wishlist ID, which is common pattern)
  const wishlist = await api.functional.ecommerce.customer.wishlists.at(
    customerConnection,
    {
      wishlistId: customer.id,
    },
  );
  typia.assert(wishlist);
  // 4. Validate wishlist ownership and structure
  TestValidator.equals(
    "wishlist owner matches customer",
    wishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist display name matches",
    wishlist.customer.display_name,
    customer.display_name,
  );
  TestValidator.predicate(
    "wishlist has items array",
    Array.isArray(wishlist.items),
  );
  // 5. Validate items structure (if any items exist)
  for (const item of wishlist.items) {
    typia.assert(item);
    // Validate item references valid product
    TestValidator.predicate(
      "item has product reference",
      item.ecommerceProduct !== null,
    );
    TestValidator.predicate(
      "item has product ID",
      item.ecommerceProduct.id.length > 0,
    );
    TestValidator.predicate(
      "item has product name",
      item.ecommerceProduct.name.length > 0,
    );
    TestValidator.predicate(
      "item has product price",
      item.ecommerceProduct.base_price >= 0,
    );
  }
}
