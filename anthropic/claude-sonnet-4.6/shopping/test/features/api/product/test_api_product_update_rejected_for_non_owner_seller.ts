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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_update_rejected_for_non_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register and authenticate Admin ───────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── Step 2: Register Seller A ─────────────────────────────────────────
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    },
  });
  // ─── Step 3: Seller A submits approval request ─────────────────────────
  const sellerAApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerAConnection,
      { body: {} },
    );
  typia.assert(sellerAApproval);
  // ─── Step 4: Admin approves Seller A ───────────────────────────────────
  const approvedSellerA =
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
  typia.assert(approvedSellerA);
  // ─── Step 5: Admin creates a category ──────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // ─── Step 6: Seller A creates a product ────────────────────────────────
  // Re-authenticate Seller A to have the valid approved session
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  const sellerAProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(sellerAProduct);
  // ─── Step 7: Register Seller B ─────────────────────────────────────────
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    },
  });
  // ─── Step 8: Seller B submits approval request ─────────────────────────
  const sellerBApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerBConnection,
      { body: {} },
    );
  typia.assert(sellerBApproval);
  // ─── Step 9: Admin approves Seller B ───────────────────────────────────
  const approvedSellerB =
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
  typia.assert(approvedSellerB);
  // Re-authenticate Seller B to get a fresh approved session
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // ─── Step 10: Seller B attempts to update Seller A's product ───────────
  // This must be rejected with 403 Forbidden (ownership check failure)
  await TestValidator.httpError(
    "seller B cannot update seller A's product (403 Forbidden - ownership check)",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        sellerBConnection,
        {
          productId: sellerAProduct.id,
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            base_price: 9999,
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    },
  );
}
