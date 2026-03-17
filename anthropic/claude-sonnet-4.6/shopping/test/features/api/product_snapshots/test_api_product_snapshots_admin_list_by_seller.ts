import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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

export async function test_api_product_snapshots_admin_list_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and create admin-scoped connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category (admin-scoped)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Register seller and create seller-scoped connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 5. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedSeller);
  // 6. Seller creates a product (auto-generates first snapshot)
  const productName = RandomGenerator.paragraph({ sentences: 3 });
  const productDescription = RandomGenerator.paragraph({ sentences: 5 });
  const basePrice = 9900;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: basePrice,
        categoryId: category.id,
        images: [
          {
            urls: [typia.random<string & tags.Format<"url">>()],
          },
        ],
        variants: [
          {
            sku: RandomGenerator.alphaNumeric(12),
            priceOverride: null,
            options: [
              {
                key: "color",
                value: "red",
                sequence: 0 as number & tags.Type<"int32">,
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 7. Admin retrieves the snapshot list for the seller's product
  const page =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(page);
  // Validations
  TestValidator.predicate(
    "data has at least 1 snapshot",
    () => page.data.length >= 1,
  );
  TestValidator.predicate(
    "records matches data length",
    () => page.pagination.records === page.data.length,
  );
  TestValidator.predicate(
    "current page is valid",
    () => page.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", () => page.pagination.limit >= 1);
  TestValidator.predicate("pages is valid", () => page.pagination.pages >= 1);
  // Validate first snapshot fields match product creation data
  const firstSnapshot = page.data[0]!;
  TestValidator.equals(
    "snapshot name matches product name",
    firstSnapshot.name,
    productName,
  );
  TestValidator.equals(
    "snapshot base_price matches creation",
    firstSnapshot.base_price,
    basePrice,
  );
  TestValidator.equals(
    "snapshot category_name matches category",
    firstSnapshot.category_name,
    category.name,
  );
  // Validate chronological order (most recent first) when multiple snapshots exist
  if (page.data.length > 1) {
    for (let i = 0; i < page.data.length - 1; i++) {
      const curr = new Date(page.data[i]!.created_at).getTime();
      const next = new Date(page.data[i + 1]!.created_at).getTime();
      TestValidator.predicate(
        `snapshot[${i}] is more recent than snapshot[${i + 1}]`,
        () => curr >= next,
      );
    }
  }
}
