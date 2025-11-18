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
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify that creating a SKU attribute value association requires seller
 * authentication.
 *
 * Business context
 *
 * - Catalog modifications like binding attribute values to SKUs must be performed
 *   only by authenticated sellers (or privileged actors). An unauthenticated
 *   caller must not be able to attach additional attribute values, even if they
 *   know valid identifiers.
 *
 * Test goals
 *
 * 1. Build a realistic catalog fixture where a seller and an admin cooperate:
 *
 *    - Admin defines global inventory state and a category.
 *    - Seller creates a product.
 *    - Admin links the product to the category and defines a product attribute.
 *    - Seller defines an attribute value for that attribute.
 *    - Seller creates a SKU wired to the created inventory state and attribute
 *         value.
 * 2. Attempt to create an additional SKU–attribute-value association using a
 *    connection without any Authorization header, even though all identifiers
 *    and payload structures are valid.
 * 3. Assert that this unauthenticated attempt fails (throws an error).
 * 4. As a sanity check, perform the same association call again using an
 *    authenticated seller connection and assert that it succeeds with correctly
 *    wired foreign keys.
 */
export async function test_api_sku_attribute_value_creation_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Admin creates inventory state
  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphabets(8)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 3. Admin creates category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Seller join & login
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const sellerLoginBody = {
    email: sellerJoin.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Seller creates product
  const productBody = {
    code: `prod-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Admin links product to category
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);
  TestValidator.equals(
    "product-category link should target the created product",
    productCategory.shopping_mall_product_id,
    product.id,
  );

  // 7. Admin creates product attribute
  const attributeBody = {
    name: `attr_${RandomGenerator.alphabets(5)}`,
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeBody,
      },
    );
  typia.assert(attribute);
  TestValidator.equals(
    "attribute product id should match created product",
    attribute.product.id,
    product.id,
  );

  // 8. Seller creates attribute value
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  const attributeValueBody = {
    value: "RED",
    display_value: "Red",
    display_order: 0,
  } satisfies IShoppingMallProductAttributeValue.ICreate;
  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id,
        productAttributeId: attribute.id,
        body: attributeValueBody,
      },
    );
  typia.assert(attributeValue);
  TestValidator.equals(
    "attribute value should belong to same attribute",
    attributeValue.attribute.id,
    attribute.id,
  );

  // 9. Seller creates SKU wired to inventory state and attribute value
  const skuBody = {
    code: `sku-${RandomGenerator.alphabets(8)}`,
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [attributeValue.id],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);
  TestValidator.equals(
    "SKU product id should match created product",
    sku.product.id,
    product.id,
  );
  TestValidator.equals(
    "SKU inventory state should match created inventory state",
    sku.inventory_state.id,
    inventoryState.id,
  );

  // 10. Build unauthenticated connection (no Authorization)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 11. Attempt SKU attribute value creation without auth – must fail
  const skuAttributeValueBody = {
    shopping_mall_product_attribute_value_id: attributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  await TestValidator.error(
    "unauthenticated SKU attribute value creation should fail",
    async () => {
      await api.functional.shoppingMall.seller.skus.attributeValues.create(
        unauthenticated,
        {
          skuId: sku.id,
          body: skuAttributeValueBody,
        },
      );
    },
  );

  // 12. Authenticated sanity check – same call should succeed
  const sellerReloginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReloginAgain);

  const skuAttributeValue: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: skuAttributeValueBody,
      },
    );
  typia.assert(skuAttributeValue);

  TestValidator.equals(
    "SKU attribute value should reference correct SKU",
    skuAttributeValue.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "SKU attribute value should reference correct attribute value",
    skuAttributeValue.shopping_mall_product_attribute_value_id,
    attributeValue.id,
  );
}
