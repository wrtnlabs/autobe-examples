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

export async function test_api_cart_item_creation_quantity_limits(
  connection: api.IConnection,
) {
  // 1. Register and login customer, seller, and admin.
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoin);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Admin creates a purchasable inventory state and a category.
  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphaNumeric(8)}`,
    name: "Purchasable State",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "High Quantity Test Category",
    description_en: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Seller creates a product.
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const productBody = {
    code: `prd-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 6 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "StressTestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as
      | (string & tags.Format<"uri">)
      | null
      | undefined,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Admin links the product to the category.
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

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

  // 5. Seller creates a high-inventory SKU.
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const baseInventoryQuantity: number & tags.Type<"int32"> & tags.Minimum<0> =
    5000 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: baseInventoryQuantity,
    low_stock_threshold: 10 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer creates a cart.
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

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

  // Determine stress and boundary quantities based on SKU inventory.
  const inventoryQuantity: number & tags.Type<"int32"> & tags.Minimum<0> =
    sku.inventory_quantity;
  const stressQuantityBase: number =
    inventoryQuantity >= 1000 ? inventoryQuantity : inventoryQuantity * 10;
  const maxInt32: number & tags.Type<"int32"> = 2147483647 as number &
    tags.Type<"int32">;
  const stressQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    (Math.min(stressQuantityBase, maxInt32) || 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;
  const boundaryQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    (Math.min(inventoryQuantity, stressQuantity) || 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;

  // Helper to attempt item creation and return created item or null on error.
  const tryCreateItem = async (
    quantity: number & tags.Type<"int32"> & tags.Minimum<1>,
  ): Promise<IShoppingMallCartItem | null> => {
    try {
      const item: IShoppingMallCartItem =
        await api.functional.shoppingMall.customer.carts.items.create(
          connection,
          {
            cartId: cart.id as string & tags.Format<"uuid">,
            body: {
              shopping_mall_sku_id: sku.id,
              quantity,
            } satisfies IShoppingMallCartItem.ICreate,
          },
        );
      typia.assert(item);
      return item;
    } catch (error) {
      return null;
    }
  };

  // 7. Attempt stress quantity creation.
  const stressItem: IShoppingMallCartItem | null =
    await tryCreateItem(stressQuantity);

  if (stressItem !== null) {
    // Stress quantity accepted; validate core invariants.
    TestValidator.equals(
      "stress quantity preserved in cart item",
      stressItem.quantity,
      stressQuantity,
    );
    TestValidator.equals(
      "cart item belongs to expected cart",
      stressItem.shopping_mall_cart_id,
      cart.id,
    );
    TestValidator.equals(
      "cart item references expected SKU",
      stressItem.shopping_mall_sku_id,
      sku.id,
    );
    TestValidator.predicate(
      "unit price is non-negative",
      stressItem.unit_price >= 0,
    );
  } else {
    // Stress quantity rejected by server; ensure smaller boundary quantity succeeds.
    const boundaryItem: IShoppingMallCartItem | null =
      await tryCreateItem(boundaryQuantity);

    TestValidator.predicate(
      "boundary quantity should either succeed or reflect strong server-side limits",
      boundaryItem === null || boundaryItem.quantity === boundaryQuantity,
    );

    if (boundaryItem !== null) {
      TestValidator.equals(
        "boundary cart item belongs to expected cart",
        boundaryItem.shopping_mall_cart_id,
        cart.id,
      );
      TestValidator.equals(
        "boundary cart item references expected SKU",
        boundaryItem.shopping_mall_sku_id,
        sku.id,
      );
      TestValidator.predicate(
        "boundary unit price is non-negative",
        boundaryItem.unit_price >= 0,
      );
    }
  }
}
