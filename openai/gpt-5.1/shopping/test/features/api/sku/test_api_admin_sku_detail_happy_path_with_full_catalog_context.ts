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

export async function test_api_admin_sku_detail_happy_path_with_full_catalog_context(
  connection: api.IConnection,
) {
  // 1. Seller joins (registration implicitly authenticates seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerId = sellerAuthorized.id;
  typia.assert<string & tags.Format<"uuid">>(sellerId);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product/main.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);
  const productId = product.id;

  // 3. Admin joins (registration implicitly authenticates admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Admin creates category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: "Electronics",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. Admin links product to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productId,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 6. Admin creates SKU inventory state configuration
  const inventoryStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 7. Switch back to seller explicitly via login (ensures seller context)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAuthorized);

  // 8. Seller creates a SKU under the product using the created inventory state
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(13) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as number & tags.Minimum<0>,
    inventory_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const createdSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productId as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(createdSku);

  // 9. Switch to admin login context for detail fetch
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAuthorized);

  // 10. Admin retrieves the SKU detail
  const fetchedSku: IShoppingMallSku =
    await api.functional.shoppingMall.admin.skus.at(connection, {
      skuId: createdSku.id,
    });
  typia.assert<IShoppingMallSku>(fetchedSku);

  // 11. Assertions on core identity and joins
  TestValidator.equals(
    "created SKU id must match fetched SKU id",
    fetchedSku.id,
    createdSku.id,
  );

  TestValidator.equals(
    "fetched SKU's product id must match product id",
    fetchedSku.product.id,
    productId,
  );

  TestValidator.predicate(
    "fetched SKU's product name should be non-empty",
    fetchedSku.product.name.length > 0,
  );

  TestValidator.equals(
    "fetched SKU's inventory_state id must match created inventory state id",
    fetchedSku.inventory_state.id,
    inventoryState.id,
  );

  TestValidator.equals(
    "fetched SKU's inventory_state code must match created inventory state code",
    fetchedSku.inventory_state.code,
    inventoryState.code,
  );

  TestValidator.equals(
    "fetched SKU's inventory_state is_purchasable must match created inventory state flag",
    fetchedSku.inventory_state.is_purchasable,
    inventoryState.is_purchasable,
  );

  // 12. Scalar field equality checks between created and fetched SKU
  TestValidator.equals("SKU code must match", fetchedSku.code, createdSku.code);

  TestValidator.equals(
    "SKU status must match",
    fetchedSku.status,
    createdSku.status,
  );

  TestValidator.equals(
    "SKU price must match",
    fetchedSku.price,
    createdSku.price,
  );

  TestValidator.equals(
    "SKU original_price must match",
    fetchedSku.original_price ?? null,
    createdSku.original_price ?? null,
  );

  TestValidator.equals(
    "SKU inventory_quantity must match",
    fetchedSku.inventory_quantity,
    createdSku.inventory_quantity,
  );

  TestValidator.equals(
    "SKU low_stock_threshold must match",
    fetchedSku.low_stock_threshold ?? null,
    createdSku.low_stock_threshold ?? null,
  );

  // 13. Soft-deletion must be null for a fresh SKU
  TestValidator.equals(
    "SKU deleted_at must be null for a newly created SKU",
    fetchedSku.deleted_at ?? null,
    null,
  );
}
