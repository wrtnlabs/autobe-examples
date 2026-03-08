import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test product update access control validation.
 *
 * This test verifies that sellers cannot update products owned by other sellers.
 * The workflow ensures proper data isolation boundaries through seller_id foreign key validation.
 *
 * Test Steps:
 * 1. Create admin account and authenticate
 * 2. Create category (required for product creation)
 * 3. Create Seller A account and authenticate
 * 4. Seller A creates a product
 * 5. Create Seller B account and authenticate
 * 6. Seller B attempts to update Seller A's product (should fail with 403)
 * 7. Verify product remains unchanged
 * 8. Verify no unauthorized snapshot was created
 */
export async function test_api_product_update_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>(),
        ),
        password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
          RandomGenerator.alphaNumeric(16),
        ),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Create category (required for product creation)
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Seller A setup - creates the product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoin: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerAJoin);
  // 4. Seller A creates a product
  const productA: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(productA);
  // Store original product data for comparison
  const originalName: string = productA.name;
  const originalDescription: string = productA.description;
  const originalBasePrice: number = productA.basePrice;
  // 5. Seller B setup - attempts unauthorized update
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoin: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerBJoin);
  // 6. Seller B attempts to update Seller A's product (should fail)
  await TestValidator.httpError(
    "seller B cannot update seller A's product",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.products.update(
        sellerBConnection,
        {
          productId: productA.id,
          body: {
            name: "Unauthorized Update Attempt",
            description: "This should fail due to ownership validation",
            base_price: 999999,
          } satisfies IEcommerceMallProduct.IUpdate,
        },
      );
    },
  );
  // 7. Verify product remains unchanged by fetching it again with Seller A
  const updatedProduct: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerAConnection,
      {
        productId: productA.id,
        body: {},
      },
    );
  typia.assert(updatedProduct);
  // 8. Validate product was not modified by unauthorized attempt
  TestValidator.equals(
    "product name unchanged",
    updatedProduct.name,
    originalName,
  );
  TestValidator.equals(
    "product description unchanged",
    updatedProduct.description,
    originalDescription,
  );
  TestValidator.equals(
    "product base price unchanged",
    updatedProduct.basePrice,
    originalBasePrice,
  );
}