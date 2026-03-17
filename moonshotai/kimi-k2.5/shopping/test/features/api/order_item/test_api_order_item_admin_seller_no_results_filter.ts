import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_order_item_admin_seller_no_results_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(seller);
  // 3. Seller creates a product to establish seller context (but no orders created)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Admin queries order items for the seller with 'paid' status filter
  // Since no orders exist, this should return empty results
  const response =
    await api.functional.ecommerceMall.admin.sellers.orderItems.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          status: "paid",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate empty results with correct pagination metadata
  TestValidator.equals("data array is empty", response.data, []);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination records is zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    response.pagination.pages,
    0,
  );
  // 6. Test with search text that finds no matches
  const searchResponse =
    await api.functional.ecommerceMall.admin.sellers.orderItems.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          search: "nonexistent-product-name-xyz123",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals("search data array is empty", searchResponse.data, []);
  TestValidator.equals(
    "search pagination records is zero",
    searchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "search pagination pages is zero",
    searchResponse.pagination.pages,
    0,
  );
  // 7. Test with date range that excludes all orders
  const futureDateResponse =
    await api.functional.ecommerceMall.admin.sellers.orderItems.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          createdAtFrom: "2099-01-01T00:00:00.000Z",
          createdAtTo: "2099-12-31T23:59:59.999Z",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(futureDateResponse);
  TestValidator.equals(
    "date filter data array is empty",
    futureDateResponse.data,
    [],
  );
  TestValidator.equals(
    "date filter pagination records is zero",
    futureDateResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "date filter pagination pages is zero",
    futureDateResponse.pagination.pages,
    0,
  );
}
