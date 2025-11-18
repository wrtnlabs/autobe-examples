import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate cart item quantity updates against SKU inventory constraints.
 *
 * Business context: A customer can add SKUs to their shopping cart and adjust
 * quantities. However, quantity updates must respect the SKU's
 * inventory_quantity and associated inventory state: the system should allow
 * quantities up to available stock but must not allow quantities that exceed
 * stock or violate inventory policy. This test validates that the cart item
 * update API enforces those constraints in a realistic multi-actor workflow.
 *
 * End-to-end flow:
 *
 * 1. Admin join & login: obtain an admin actor that can configure SKU inventory
 *    states and product-category links.
 * 2. Seller join & login: obtain a seller actor that can create products and SKUs
 *    under their ownership.
 * 3. Customer join & login: obtain a customer actor that will own the cart and
 *    cart items.
 * 4. Admin creates a purchasable inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates using
 *    IShoppingMallSkuInventoryState.ICreate. The state has is_purchasable=true
 *    so that SKUs using it can be added to carts and ordered.
 * 5. Admin creates a category via POST /shoppingMall/admin/categories using
 *    IShoppingMallCategory.ICreate, which will be used to classify the
 *    product.
 * 6. Seller (authenticated) creates a product via POST
 *    /shoppingMall/seller/products with IShoppingMallProduct.ICreate.
 * 7. Admin links the product to the category via POST
 *    /shoppingMall/admin/products/{productId}/categories with
 *    IShoppingMallProductCategory.ICreate.
 * 8. Seller creates a SKU under the product via POST
 *    /shoppingMall/seller/products/{productId}/skus with
 *    IShoppingMallSku.ICreate, choosing a concrete inventory_quantity (for
 *    example 5 or 10) and referencing the inventory state created in step 4.
 * 9. Customer creates a cart via POST /shoppingMall/customer/carts with
 *    IShoppingMallCart.ICreate, using actor_type="customer" and a currency code
 *    such as "USD".
 * 10. Customer adds a cart item for the SKU via POST
 *     /shoppingMall/customer/carts/{cartId}/items with
 *     IShoppingMallCartItem.ICreate, using a modest initial quantity such as
 *     1.
 * 11. Boundary success case: Customer calls PUT
 *     /shoppingMall/customer/carts/{cartId}/items/{cartItemId} with
 *     IShoppingMallCartItem.IUpdate where quantity is set equal to the SKU's
 *     inventory_quantity (boundary). Expect the update to succeed and the
 *     returned cart item to show quantity == inventory_quantity. Use
 *     typia.assert on the response and TestValidator.equals to assert the
 *     quantity.
 * 12. Excessive failure case: Customer attempts to update the same cart item again
 *     via PUT /shoppingMall/customer/carts/{cartId}/items/{cartItemId} with
 *     quantity set to inventory_quantity + 1 (strictly greater than available
 *     stock). Wrap this call in TestValidator.error to assert that some error
 *     is raised, without asserting specific HTTP status codes or error body
 *     structure. This validates that the backend rejects clearly excessive
 *     quantities for the cart item.
 * 13. Optional post-condition: After the failed excessive update, the test can rely
 *     on the last successful response (step 11) to know the last persisted
 *     quantity, and can reassert that the in-memory expected quantity remains
 *     at the boundary value. Since there is no dedicated cart item fetch API in
 *     the materials, the test will not attempt a separate read; it simply
 *     ensures that the excessive update path throws and that the previously
 *     observed quantity was correct.
 *
 * The test uses typia.random and RandomGenerator utilities to construct
 * realistic request bodies, always respecting the DTO definitions. All API
 * calls are awaited, and each non-void response is validated with
 * typia.assert(). Business assertions are expressed via TestValidator.
 */
export async function test_api_cart_item_update_to_excessive_quantity(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "Adm1n!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicit login step to follow the dependency list, though join already
  // returns tokens.
  const adminLoginBody = {
    email: adminEmail,
    password: "Adm1n!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 2. Seller join & login
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Sell3r!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "Sell3r!",
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 3. Customer join & login
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "Cust0mer!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: "Cust0mer!",
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 4. Admin creates a purchasable inventory state
  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphaNumeric(8)}`,
    name: "purchasable",
    description: "Purchasable state for test scenario",
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

  // 5. Admin creates a category
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
  typia.assert(category);

  // 6. Seller creates a product
  const productBody = {
    code: `prod-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://img.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. Admin links product to category
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

  // 8. Seller creates a SKU with known inventory_quantity
  const inventoryQuantity: number & tags.Type<"int32"> & tags.Minimum<0> =
    5 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: inventoryQuantity,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 9. Customer creates a cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 10. Customer adds a cart item with modest initial quantity (1)
  const initialQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: initialQuantity,
  } satisfies IShoppingMallCartItem.ICreate;
  const createdItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(createdItem);

  // 11. Boundary success update: quantity == inventory_quantity
  const boundaryQuantity: number & tags.Type<"int32"> =
    inventoryQuantity satisfies number as number;
  const boundaryUpdateBody = {
    quantity: boundaryQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;
  const boundaryUpdatedItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId: cart.id,
      cartItemId: createdItem.id,
      body: boundaryUpdateBody,
    });
  typia.assert(boundaryUpdatedItem);
  TestValidator.equals(
    "cart item quantity should be updated to boundary inventory quantity",
    boundaryUpdatedItem.quantity,
    boundaryQuantity,
  );

  // 12. Excessive failure case: quantity > inventory_quantity
  const excessiveQuantity: number & tags.Type<"int32"> = (inventoryQuantity +
    1) satisfies number as number;
  const excessiveUpdateBody = {
    quantity: excessiveQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;
  await TestValidator.error(
    "updating cart item to quantity greater than inventory should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.update(
        connection,
        {
          cartId: cart.id,
          cartItemId: createdItem.id,
          body: excessiveUpdateBody,
        },
      );
    },
  );
}
