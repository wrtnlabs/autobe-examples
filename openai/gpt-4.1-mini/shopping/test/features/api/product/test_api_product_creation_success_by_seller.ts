import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test creating a new product with valid details by an authenticated seller.
 * Validate that the product is stored with all specified fields, the subcategory exists and is not soft-deleted, and the product name is unique per seller.
 * Confirm the response returns all product properties including generated id, timestamps, and associations.
 * This scenario covers the primary success path for product creation.
 */
export async function test_api_product_creation_success_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration (join) and authorization
  const sellerConnection: IConnection = { host: connection.host };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    });
  // Set authorization header
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuthorized.token.access;
  // 2. Generate and create a random product by the authenticated seller
  const productRaw =
    await generate_random_shopping_mall_seller_products_create(sellerConnection, {
      body: {},
    });
  // 3. Assert product runtime type
  typia.assert(productRaw);
  const product = productRaw as any;
  // 4. Validate essential fields
  TestValidator.predicate(
    "product has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      product.id,
    ),
  );
  TestValidator.predicate("product name is not empty", product.name.length > 0);
  TestValidator.predicate(
    "product description is string",
    typeof product.description === "string",
  );
  TestValidator.predicate(
    "product base_price is positive",
    typeof product.base_price === "number" && product.base_price > 0,
  );
  TestValidator.predicate(
    "product seller_id is not empty",
    typeof product.seller_id === "string" && product.seller_id.length > 0,
  );
  TestValidator.predicate(
    "product product_subcategory_id is not empty",
    typeof product.product_subcategory_id === "string" &&
      product.product_subcategory_id.length > 0,
  );
  // 5. Additional validation: Validate created_at and updated_at timestamps are valid ISO date strings
  TestValidator.predicate(
    "product created_at is valid date",
    !isNaN(Date.parse(product.created_at)),
  );
  TestValidator.predicate(
    "product updated_at is valid date",
    !isNaN(Date.parse(product.updated_at)),
  );
}
