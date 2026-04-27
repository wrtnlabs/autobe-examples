import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that an administrator receives a 404 Not Found response when attempting to view a product that has been soft-deleted by another administrator.
 *
 * This test validates the business rule that deleted products are completely hidden from administrator detail views. When an administrator sets a product's visibility to 'deleted' via the erase endpoint, subsequent GET requests for that product ID should return 404 rather than the product data.
 *
 * The test follows a multi-actor flow: two separate administrator accounts are created to ensure the deletion and read operations are independent, and a seller account creates the product that gets deleted.
 *
 * 1. Admin #1 registers and authenticates (establishing admin context)
 * 2. Seller registers and authenticates
 * 3. Seller creates a product that will later be deleted
 * 4. Admin #2 registers and authenticates (separate admin identity)
 * 5. Admin #2 soft-deletes the product via DELETE /administrator/products/{productId}
 * 6. Admin #2 attempts to GET the same deleted product - expects a 404 Not Found response
 */
export async function test_api_administrator_product_deleted_by_admin_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin #1 joins
  const adminConnection1: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // Step 2: Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 3: Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 4: Admin #2 joins (different admin account)
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // Step 5: Admin #2 deletes the product (soft-delete)
  await api.functional.eCommerceMall.administrator.products.erase(
    adminConnection2,
    {
      productId: product.id,
    },
  );
  // Step 6: Admin #2 attempts to GET the deleted product → expect 404
  await TestValidator.httpError(
    "deleted product returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.products.at(
        adminConnection2,
        {
          productId: product.id,
        },
      );
    },
  );
}
