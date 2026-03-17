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

export async function test_api_wishlist_entry_detail_owned_customer(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  const created: IShoppingMallWishlistEntry =
    await generate_random_shopping_mall_customer_wishlist_entries_create(
      customerConnection,
      {},
    );
  typia.assert(created);
  const found: IShoppingMallWishlistEntry =
    await api.functional.shoppingMall.customer.wishlistEntries.at(
      customerConnection,
      {
        wishlistEntryId: created.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("wishlist entry id matches", found.id, created.id);
  TestValidator.equals(
    "wishlist entry created_at matches",
    found.created_at,
    created.created_at,
  );
  TestValidator.equals("wishlist entry remains active", found.deleted_at, null);
  TestValidator.equals(
    "owner customer id matches authenticated customer",
    found.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "owner customer id matches created entry",
    found.customer.id,
    created.customer.id,
  );
  TestValidator.equals(
    "owner customer email matches authenticated customer",
    found.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "owner customer email matches created entry",
    found.customer.email,
    created.customer.email,
  );
  TestValidator.equals(
    "owner customer banned_at unchanged",
    found.customer.banned_at,
    created.customer.banned_at,
  );
  TestValidator.equals(
    "owner customer created_at unchanged",
    found.customer.created_at,
    created.customer.created_at,
  );
  TestValidator.equals(
    "owner customer deleted_at unchanged",
    found.customer.deleted_at,
    created.customer.deleted_at,
  );
  TestValidator.equals(
    "saved product id matches created entry",
    found.product.id,
    created.product.id,
  );
  TestValidator.equals(
    "saved product name reflects current catalog summary",
    found.product.name,
    created.product.name,
  );
  TestValidator.equals(
    "saved product description reflects current catalog summary",
    found.product.description,
    created.product.description,
  );
  TestValidator.equals(
    "saved product base price reflects current catalog summary",
    found.product.base_price,
    created.product.base_price,
  );
  TestValidator.equals(
    "saved product status reflects current catalog summary",
    found.product.status,
    created.product.status,
  );
  TestValidator.equals(
    "saved product created_at unchanged",
    found.product.created_at,
    created.product.created_at,
  );
  TestValidator.equals(
    "saved product deleted_at unchanged",
    found.product.deleted_at,
    created.product.deleted_at,
  );
  TestValidator.equals(
    "saved product seller id unchanged",
    found.product.seller.id,
    created.product.seller.id,
  );
  TestValidator.equals(
    "saved product seller email unchanged",
    found.product.seller.email,
    created.product.seller.email,
  );
  TestValidator.equals(
    "saved product seller approval status unchanged",
    found.product.seller.approval_status,
    created.product.seller.approval_status,
  );
  TestValidator.equals(
    "saved product seller rejection reason unchanged",
    found.product.seller.rejection_reason,
    created.product.seller.rejection_reason,
  );
  TestValidator.equals(
    "saved product seller suspended unchanged",
    found.product.seller.suspended,
    created.product.seller.suspended,
  );
  TestValidator.equals(
    "saved product seller banned unchanged",
    found.product.seller.banned,
    created.product.seller.banned,
  );
  TestValidator.equals(
    "saved product seller created_at unchanged",
    found.product.seller.created_at,
    created.product.seller.created_at,
  );
  TestValidator.equals(
    "saved product seller deleted_at unchanged",
    found.product.seller.deleted_at,
    created.product.seller.deleted_at,
  );
  TestValidator.equals(
    "saved product category unchanged",
    found.product.category,
    created.product.category,
  );
}
