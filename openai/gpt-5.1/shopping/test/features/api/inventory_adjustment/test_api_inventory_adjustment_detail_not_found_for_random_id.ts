import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustment";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_inventory_adjustment_detail_not_found_for_random_id(
  connection: api.IConnection,
) {
  // 1. Admin joins (register) and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed minimal background data to ensure environment is realistic
  // 2-1. Create a category as admin (still authenticated as admin)
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 2-2. Create a SKU inventory state as admin
  const skuInventoryStateBody = {
    code: `state-${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 2-3. Seller joins and becomes authenticated as seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2-4. Create a seller warehouse as the authenticated seller
  const sellerWarehouseBody = {
    code: `wh-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Warehouse",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const sellerWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: sellerWarehouseBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(sellerWarehouse);

  // 2-5. Create a product as seller
  const productBody = {
    code: `prd-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 2-6. Create a SKU for that product as seller
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: undefined,
    external_ids: [] as IShoppingMallSkuExternalId.ICreate[] | undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 2-7. Switch connection back to admin by logging in with the same admin email/password
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginResult);

  // 2-8. Create an inventory adjustment as admin for the seller/SKU/warehouse
  const inventoryAdjustmentBody = {
    seller_id: sellerAuthorized.id,
    sku_id: sku.id,
    seller_warehouse_id: sellerWarehouse.id,
    inventory_adjustment_reason_id: (
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
        connection,
        {
          body: {
            code: `reason-${RandomGenerator.alphaNumeric(6)}`,
            name: "Manual Correction",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            direction: "increase",
            is_system_managed: false,
          } satisfies IShoppingMallInventoryAdjustmentReason.ICreate,
        },
      )
    ).id,
    direction: "increase",
    quantity_delta: 5,
    reference_type: "manual_test",
    reference_id: `ref-${RandomGenerator.alphaNumeric(8)}`,
    note: RandomGenerator.paragraph({ sentences: 4 }),
    occurred_at: new Date().toISOString(),
  } satisfies IShoppingMallInventoryAdjustment.ICreate;

  const createdAdjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      {
        body: inventoryAdjustmentBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustment>(createdAdjustment);

  // 3. Generate a random, non-existent inventoryAdjustmentId
  const randomInventoryAdjustmentId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  // Extremely unlikely, but ensure we do not accidentally reuse the existing id
  const targetId: string & tags.Format<"uuid"> =
    randomInventoryAdjustmentId === createdAdjustment.id
      ? typia.random<string & tags.Format<"uuid">>()
      : randomInventoryAdjustmentId;

  // 4. As authenticated admin, call detail endpoint with non-existent ID and
  //    assert that it results in an error (likely 404-like), not a successful 200.
  await TestValidator.error(
    "inventory adjustment detail should error for non-existent ID",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustments.at(
        connection,
        {
          inventoryAdjustmentId: targetId,
        },
      );
    },
  );

  // Note: We intentionally do not inspect HttpError status codes or body
  // structure here, per guidelines. The fact that an error is thrown and
  // captured by TestValidator.error is sufficient to verify that the endpoint
  // does not return a successful 200 response for a random non-existent ID.
}
