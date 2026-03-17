import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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

export async function test_api_product_snapshot_images_access_denied_for_non_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category (required for product creation)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. First seller (owner) setup
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 4. Owner submits approval request
  const ownerApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      ownerConnection,
      {},
    );
  typia.assert(ownerApproval);
  // 5. Admin approves the first seller
  const ownerApprovalResult =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: ownerApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(ownerApprovalResult);
  // 6. First seller creates a product with images
  const product = await generate_random_shopping_mall_seller_products_create(
    ownerConnection,
    {
      body: {
        categoryId: category.id,
        images: [
          {
            urls: [typia.random<string & tags.Format<"url">>()],
          },
        ],
      },
    },
  );
  typia.assert(product);
  const productId = product.id;
  // snapshotId is not directly available in IShoppingMallProduct response,
  // use a random UUID - the server's ownership check (403) should occur before
  // or at the same level as snapshot validation
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 7. Second seller (attacker) setup
  const attackerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 8. Attacker submits approval request
  const attackerApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      attackerConnection,
      {},
    );
  typia.assert(attackerApproval);
  // 9. Admin approves the second seller
  const attackerApprovalResult =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: attackerApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(attackerApprovalResult);
  // 10. Authorization failure test:
  // Non-owner seller (attacker) should receive 403 Forbidden
  // when trying to access the owner's product snapshot images
  await TestValidator.httpError(
    "non-owner seller must be denied access with 403",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.index(
        attackerConnection,
        {
          productId,
          snapshotId,
          body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
        },
      );
    },
  );
  // 11. Contrast: owner (first seller) should NOT receive 403
  // They may receive 404 if the random snapshotId doesn't exist,
  // but they must not be refused with 403 (ownership check should pass)
  try {
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      ownerConnection,
      {
        productId,
        snapshotId,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  } catch (error) {
    // Owner should not receive 403 Forbidden - any other error (e.g., 404) is acceptable
    if (error instanceof api.HttpError) {
      TestValidator.predicate(
        "owner must not receive 403 - ownership check should pass",
        error.status !== 403,
      );
    }
    // Non-HttpError or 404-type errors are acceptable for owner with random snapshotId
  }
}
