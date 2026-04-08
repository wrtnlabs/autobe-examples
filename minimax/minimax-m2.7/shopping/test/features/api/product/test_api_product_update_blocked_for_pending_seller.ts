import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_update_blocked_for_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category for the test
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller A registers and joins the platform (initially pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // Verify seller is in pending status
  TestValidator.equals(
    "seller approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  // 3. Seller attempts to create a product
  // Based on the API, pending sellers should be able to create products but cannot update them
  // However, we test the update restriction directly
  let productId: string | null = null;
  let productCreated = false;
  try {
    const product =
      await generate_random_ecommerce_mall_seller_sellers_me_products_create(
        sellerConnection,
        {
          body: {
            categoryId: category.id,
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            basePrice: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          },
        },
      );
    typia.assert(product);
    productId = product.id;
    productCreated = true;
  } catch (error) {
    // If pending seller cannot create products either, that's also a valid restriction
    // In this case, we create a product as admin and test that pending seller cannot update it
    const product =
      await generate_random_ecommerce_mall_seller_sellers_me_products_create(
        adminConnection as any,
        {
          body: {
            categoryId: category.id,
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            basePrice: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          },
        },
      );
    typia.assert(product);
    productId = product.id;
    productCreated = false;
  }
  // 4. Verify Seller (pending) cannot update the product - should receive 403 Forbidden error
  await TestValidator.httpError(
    "pending seller cannot update product - receives 403 Forbidden",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
        sellerConnection,
        {
          productId: productId!,
          body: {
            name: "Attempted Update by Pending Seller",
          } satisfies IEcommerceMallProduct.IUpdate,
        },
      );
    },
  );
  // Note: Full approval workflow cannot be tested as no admin seller approval endpoint exists
  // The test validates that pending sellers receive 403 error when attempting product updates
}
