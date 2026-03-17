import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlist_entries_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_entries_create";
import { prepare_random_shopping_mall_wishlist_entry } from "../../../prepare/prepare_random_shopping_mall_wishlist_entry";

export async function test_api_wishlist_entry_create_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {},
    });
  typia.assert(authorized);
  const wishlistEntry: IShoppingMallWishlistEntry =
    await generate_random_shopping_mall_customer_wishlist_entries_create(
      customerConnection,
      {},
    );
  typia.assert(wishlistEntry);
  TestValidator.equals(
    "wishlist entry customer id matches authenticated customer",
    wishlistEntry.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "wishlist entry customer email matches authenticated customer",
    wishlistEntry.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "wishlist entry customer remains active",
    wishlistEntry.customer.deleted_at,
    null,
  );
  TestValidator.equals(
    "wishlist entry remains active",
    wishlistEntry.deleted_at,
    null,
  );
  TestValidator.equals(
    "saved product remains active",
    wishlistEntry.product.deleted_at,
    null,
  );
  TestValidator.predicate(
    "wishlist entry has its own identifier",
    wishlistEntry.id.length > 0,
  );
  TestValidator.predicate(
    "wishlist entry exposes product summary target",
    wishlistEntry.product.id.length > 0 &&
      wishlistEntry.product.name.length > 0,
  );
  TestValidator.predicate(
    "wishlist entry has lifecycle timestamps",
    wishlistEntry.created_at.length > 0 && wishlistEntry.updated_at.length > 0,
  );
}
