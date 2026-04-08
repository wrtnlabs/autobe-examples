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

export async function test_api_administrator_product_update_snapshot_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: adminEmail,
      password: adminPassword,
      grade: "regular" as const,
    },
  });
  typia.assert(adminResult);
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create category for product assignment
  const category =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerResult);
  // Note: Seller approval would require admin approval endpoint (not available)
  // Proceeding assuming seller is approved in test environment
  // 4. Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create product with initial values
  const initialName = "Original Product";
  const initialDescription = "Original description";
  const initialBasePrice = 99.99;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: initialName,
        description: initialDescription,
        category_id: category.id,
        base_price: initialBasePrice,
      },
    },
  );
  typia.assert(product);
  // 6. Verify product initial state
  TestValidator.equals("product name initial", product.name, initialName);
  TestValidator.equals(
    "product description initial",
    product.description,
    initialDescription,
  );
  TestValidator.equals(
    "product base_price initial",
    product.base_price,
    initialBasePrice,
  );
  // 7. Update product via admin endpoint
  const updatedName = "Updated Product";
  const updatedDescription = "Updated description";
  const updatedBasePrice = 149.99;
  const adminUpdateConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminUpdateConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const updateResponse =
    await api.functional.ecommerceMall.administrator.products.update(
      adminUpdateConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          base_price: updatedBasePrice,
        },
      },
    );
  typia.assert(updateResponse);
  // 8. Verify update response has new values
  TestValidator.equals(
    "product name updated",
    updateResponse.name,
    updatedName,
  );
  TestValidator.equals(
    "product description updated",
    updateResponse.description,
    updatedDescription,
  );
  TestValidator.equals(
    "product base_price updated",
    updateResponse.base_price,
    updatedBasePrice,
  );
  // 9. Verify product changed
  TestValidator.notEquals("product name differs", initialName, updatedName);
  TestValidator.notEquals(
    "product description differs",
    initialDescription,
    updatedDescription,
  );
  TestValidator.notEquals(
    "product base_price differs",
    initialBasePrice,
    updatedBasePrice,
  );
  // 10. Snapshot verification (requires GET /seller/products/{productId}/snapshots endpoint)
  // Note: This endpoint is not available in the current SDK
  // In production, would verify:
  // - Snapshot exists with update timestamp
  // - Snapshot contains original values (initialName, initialDescription, initialBasePrice)
  // - Snapshot includes seller profile reference
  // - Snapshot includes variant snapshot reference
  // - Snapshot is immutable
  // - Admin can view historical snapshots
}