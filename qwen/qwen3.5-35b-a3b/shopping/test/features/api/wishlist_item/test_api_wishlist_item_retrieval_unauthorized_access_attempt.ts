import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_customer_wishlist_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_items_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_item_retrieval_unauthorized_access_attempt(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A account
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerA);
  // 2. Create Customer B account
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerB);
  // 3. Customer A creates a wishlist item
  const product: IEcommerceMallProduct.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100>
    >(),
    slug: typia.random<string>(),
    status: "active",
    category: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(2),
      slug: typia.random<string>(),
    } satisfies IEcommerceMallCategory.ISummary,
    deleted_at: null,
  };
  const wishlistItem: IEcommerceMallWishlistItem =
    await generate_random_ecommerce_mall_customer_wishlist_items_create(
      customerAConnection,
      {
        body: {
          product_id: product.id,
        } satisfies IEcommerceMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  // 4. Customer B attempts to retrieve Customer A's wishlist item
  await TestValidator.httpError(
    "Customer B cannot access Customer A's wishlist item",
    403,
    async () =>
      await api.functional.ecommerceMall.customer.wishlist_items.at(
        customerBConnection,
        {
          wishlistItemId: wishlistItem.id,
        },
      ),
  );
}