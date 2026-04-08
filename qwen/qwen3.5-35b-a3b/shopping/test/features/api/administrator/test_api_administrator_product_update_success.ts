import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_administrator_product_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminJoinConnection,
    {},
  );
  typia.assert(adminJoinResponse);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: {
        email: adminJoinResponse.email,
        password: "12345678",
        referrer: "https://admin.test.com/login",
        ip: "192.168.1.100",
      } satisfies IEcommerceMallAdministrator.ILogin,
    },
  );
  typia.assert(adminLoginResponse);
  // 2. Create category with admin credentials
  const adminCategoryConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminLoginResponse.token.access}` },
  };
  const category =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminCategoryConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(
    sellerJoinConnection,
    {},
  );
  typia.assert(sellerJoinResponse);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResponse = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerJoinResponse.email,
        password: "12345678",
        href: "https://seller.test.com",
        referrer: "https://seller.test.com/login",
        ip: "192.168.1.101",
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResponse);
  // 4. Create product with initial values using seller credentials
  const sellerProductConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerLoginResponse.token.access}` },
  };
  const initialProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerProductConnection,
      {
        body: {
          name: "Initial Product Name",
          description: "Initial product description",
          category_id: category.id,
          base_price: 50.0,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(initialProduct);
  const initialCreatedAt = initialProduct.created_at;
  // 5. Update product via admin credentials
  const adminUpdateConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminLoginResponse.token.access}` },
  };
  const updatedProduct =
    await api.functional.ecommerceMall.administrator.products.update(
      adminUpdateConnection,
      {
        productId: initialProduct.id,
        body: {
          name: "Updated Product Name",
          description: "Updated description with more details",
          base_price: 75.99,
          category_id: category.id,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 6. Validate update
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    "Updated Product Name",
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    "Updated description with more details",
  );
  TestValidator.equals(
    "product base_price updated",
    updatedProduct.base_price,
    75.99,
  );
  TestValidator.equals(
    "product category unchanged",
    updatedProduct.category.id,
    category.id,
  );
  TestValidator.equals(
    "product seller unchanged",
    updatedProduct.seller.id,
    initialProduct.seller.id,
  );
  TestValidator.equals(
    "product images present",
    updatedProduct.images.length,
    initialProduct.images.length,
  );
  TestValidator.equals(
    "product variants present",
    updatedProduct.variants.length,
    initialProduct.variants.length,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProduct.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedProduct.updated_at,
    initialCreatedAt,
  );
}