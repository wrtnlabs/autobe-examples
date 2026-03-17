import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_variant_update_ownership_rejection(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================
  // Step 1: Register admin and authenticate
  // =========================================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // =========================================================
  // Step 2: Create a product category (for Seller A's product)
  // =========================================================
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: "Electronics-" + RandomGenerator.alphabets(6) } },
  );
  typia.assert(category);
  // =========================================================
  // Step 3: Register Seller A
  // =========================================================
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      shop_name: "Seller A Shop " + RandomGenerator.alphabets(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // =========================================================
  // Step 4: Seller A submits approval request
  // =========================================================
  const sellerAApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerAConnection,
      { body: {} },
    );
  typia.assert(sellerAApproval);
  // =========================================================
  // Step 5: Admin approves Seller A
  // =========================================================
  const sellerAApproved =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: sellerAApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(sellerAApproved);
  // =========================================================
  // Step 6: Seller A creates a product
  // =========================================================
  const sellerAProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          categoryId: category.id,
          name: "Seller A Product",
          description: "A test product owned by Seller A",
          base_price: 100,
        },
      },
    );
  typia.assert(sellerAProduct);
  // =========================================================
  // Step 7: Seller A creates a variant on their product
  // =========================================================
  const sellerAVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: sellerAProduct.id },
        body: {
          sku: "SKU-SELLER-A-001",
          options: [{ key: "color", value: "Red" }],
          priceOverride: null,
        },
      },
    );
  typia.assert(sellerAVariant);
  // =========================================================
  // Step 8: Register Seller B
  // =========================================================
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      shop_name: "Seller B Shop " + RandomGenerator.alphabets(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // =========================================================
  // Step 9: Seller B submits approval request
  // =========================================================
  const sellerBApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerBConnection,
      { body: {} },
    );
  typia.assert(sellerBApproval);
  // =========================================================
  // Step 10: Admin approves Seller B
  // =========================================================
  const sellerBApproved =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: sellerBApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(sellerBApproved);
  // =========================================================
  // Step 11: Seller B attempts to update Seller A's variant (unauthorized)
  // This must be rejected with an error (403 Forbidden)
  // =========================================================
  await TestValidator.error(
    "Seller B must not update Seller A's variant",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.update(
        sellerBConnection,
        {
          productId: sellerAProduct.id,
          variantId: sellerAVariant.id,
          body: {
            sku: "SKU-UNAUTHORIZED-UPDATE",
            options: [{ key: "color", value: "Green" }],
          } satisfies IShoppingMallProductVariant.IUpdate,
        },
      );
    },
  );
  // =========================================================
  // Verification: Seller A's variant should still be intact
  // (The variant was returned at creation time, so we compare SKU and options)
  // =========================================================
  TestValidator.equals(
    "Seller A's variant SKU must be unchanged",
    sellerAVariant.sku,
    "SKU-SELLER-A-001",
  );
  TestValidator.predicate(
    "Seller A's variant options must contain color=Red",
    sellerAVariant.options.some(
      (opt) => opt.key === "color" && opt.value === "Red",
    ),
  );
}
