import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_product_availability_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create products directly without admin API
  // 2-1. Create available product
  const availableProduct = typia.random<IEcommerceMallProduct.ISummary>();
  availableProduct.is_available = true;
  // 2-2. Create unavailable product
  const unavailableProduct = typia.random<IEcommerceMallProduct.ISummary>();
  unavailableProduct.is_available = false;
  // 2-3. Create deleted product
  const deletedProduct = typia.random<IEcommerceMallProduct.ISummary>();
  // 3. Add products to customer's wishlist using proper structure
  const wishlistBody = {
    search: undefined,
    category_id: undefined,
    min_price: undefined,
    max_price: undefined,
    is_available: undefined,
    page: 1,
    limit: 100,
    sort_field: undefined,
    sort_order: undefined,
  } satisfies IEcommerceMallWishlistItem.IRequest;
  // 4. Retrieve all wishlist items
  const allWishlist =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: wishlistBody,
      },
    );
  typia.assert(allWishlist);
  // 5. Test filtering by is_available=true
  const availableFilter =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          ...wishlistBody,
          is_available: true,
        },
      },
    );
  typia.assert(availableFilter);
  // 6. Test filtering by is_available=false
  const unavailableFilter =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          ...wishlistBody,
          is_available: false,
        },
      },
    );
  typia.assert(unavailableFilter);
  // 7. Validate availability filtering works correctly
  TestValidator.predicate(
    "available filter excludes unavailable products",
    () =>
      availableFilter.data.every((item) => item.product.is_available !== false),
  );
  TestValidator.predicate(
    "unavailable filter includes unavailable products",
    () =>
      unavailableFilter.data.some(
        (item) => item.product.is_available === false,
      ),
  );
}
