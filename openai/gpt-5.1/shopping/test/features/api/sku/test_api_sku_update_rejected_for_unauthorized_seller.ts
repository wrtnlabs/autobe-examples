import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_sku_update_rejected_for_unauthorized_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller A and establish seller A auth context
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller-a.example.com/join",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  // 2. As Seller A, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create Admin and login as Admin to create inventory state and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // explicit admin login (even though join already authenticated) to follow dependency pattern
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 3-1. Create inventory state
  const inventoryStateCreateBody = {
    code: `state-${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "Inventory available for standard purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateCreateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 3-2. Create category
  const categoryCreateBody = {
    parent_id: null,
    slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category",
    description_en: "Category for authorization tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 3-3. Attach category to product
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 4. Switch back to Seller A (ensure seller context active) and create SKU
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://seller-a.example.com/login",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALogin);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 1000 as number & tags.Minimum<0>,
    original_price: 1200 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // Sanity check: SKU belongs to the expected product id
  TestValidator.equals(
    "sku product id should match created product",
    sku.product.id,
    product.id,
  );

  // 5. Register Seller B (separate seller account)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller-b.example.com/join",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBJoin);

  // Explicit Seller B login to ensure context
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://seller-b.example.com/login",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBLogin);

  // 6. As Seller B, attempt to update Seller A's SKU
  const unauthorizedUpdateBody = {
    price: 2000 as number & tags.Minimum<0>,
    status: "inactive" as string & tags.MinLength<1> & tags.MaxLength<64>,
  } satisfies IShoppingMallSku.IUpdate;

  await TestValidator.error(
    "unauthorized seller cannot update another seller's SKU",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.update(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          skuId: sku.id as string & tags.Format<"uuid">,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );
}
