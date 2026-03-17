import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_seller_product_deleted_list_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and capture seller info
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerInfo = await authorize_seller_join(sellerConnection, {});
  // Create multiple products
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // Delete two products to create test data for deleted products list
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product1.id,
  });
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product2.id,
  });
  // Retrieve deleted products list
  const response =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  // Validate response structure - this validates all types, formats, and constraints
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches deleted products",
    response.pagination.records >= 2,
  );
  // Validate that only deleted products belonging to this seller are returned
  const deletedProductIds = response.data.map((p) => p.id);
  TestValidator.predicate(
    "contains deleted product1",
    deletedProductIds.includes(product1.id),
  );
  TestValidator.predicate(
    "contains deleted product2",
    deletedProductIds.includes(product2.id),
  );
  TestValidator.predicate(
    "does not contain active product3",
    !deletedProductIds.includes(product3.id),
  );
  // Validate that returned products belong to the authenticated seller
  const sampleProduct = response.data[0];
  TestValidator.equals(
    "product belongs to authenticated seller",
    sampleProduct.seller.id,
    sellerInfo.id,
  );
  // Validate business logic: deleted products should not be available
  TestValidator.predicate(
    "deleted products are not available",
    !sampleProduct.isAvailable,
  );
}
