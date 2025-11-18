import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
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

export async function test_api_cart_items_list_filtered_by_validation_status(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "P@ssw0rd!", // satisfies Format<"password">
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Register and authenticate an admin (for category and inventory state)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Adm1nP@ss!",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 3. Create an inventory state via admin
  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 4. Create a category via admin
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. Register and authenticate a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Sell3rP@ss!",
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 6. Create a product as the seller
  const productBody = {
    code: `prod-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 7. Link product to category via admin
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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 8. Create at least two SKUs under the product as the seller
  const skuInputs: IShoppingMallSku.ICreate[] = [0, 1, 2].map((index) => {
    return {
      code: `sku-${index}-${RandomGenerator.alphaNumeric(6)}`,
      barcode: RandomGenerator.alphaNumeric(12),
      status: "active",
      price: 1000 + index * 100,
      original_price: 1200 + index * 100,
      inventory_quantity: 10 + index,
      low_stock_threshold: 1,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;
  });

  const skus: IShoppingMallSku[] = [];
  for (const body of skuInputs) {
    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert<IShoppingMallSku>(sku);
    skus.push(sku);
  }

  // 9. Switch back to customer authentication for cart operations
  const customerLoginBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    ip: "127.0.0.1",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAfterLogin);

  // 10. Create a customer cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 11. Add multiple items to the cart for different SKUs
  const createdItems: IShoppingMallCartItem[] = [];
  for (const sku of skus) {
    const cartItemBody = {
      shopping_mall_sku_id: sku.id,
      quantity: 1,
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id as string & tags.Format<"uuid">,
          body: cartItemBody,
        },
      );
    typia.assert<IShoppingMallCartItem>(cartItem);
    createdItems.push(cartItem);
  }

  // Assume that after creation some items may have different last_validation_status values.
  // Identify a non-null last_validation_status value to filter by, if available.
  const nonNullStatuses: string[] = createdItems
    .map((item) => item.last_validation_status)
    .filter(
      (status): status is string => status !== null && status !== undefined,
    );

  let targetStatus: string | null = null;
  if (nonNullStatuses.length > 0) {
    targetStatus = nonNullStatuses[0];
  }

  // 12. Call index with filter by last_validation_status (when we have a concrete status)
  const requestPage = 1 as number & tags.Type<"int32">;
  const requestLimit = 10 as number & tags.Type<"int32">;

  const requestBodyWithFilter = {
    page: requestPage,
    limit: requestLimit,
    last_validation_status: targetStatus ?? undefined,
    sort_by: "added_at",
    sort_direction: "desc",
  } satisfies IShoppingMallCartItem.IRequest;

  const pageResult: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: requestBodyWithFilter,
    });
  typia.assert<IPageIShoppingMallCartItem.ISummary>(pageResult);

  // Basic pagination sanity checks
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "current page should equal requested page",
    pagination.current === requestPage,
  );
  TestValidator.predicate(
    "limit should be at least the number of returned records",
    pagination.limit >= pageResult.data.length,
  );

  // When we have a concrete status, assert that all items match it and belong to this cart
  if (targetStatus !== null) {
    for (const item of pageResult.data) {
      TestValidator.equals(
        "cart item belongs to the requested cart",
        item.cart_id,
        cart.id,
      );
      TestValidator.equals(
        "cart item last_validation_status matches filter",
        item.last_validation_status ?? null,
        targetStatus,
      );
    }

    TestValidator.equals(
      "pagination.records equals returned data length for controlled small dataset",
      pagination.records,
      pageResult.data.length,
    );
  } else {
    // If the backend did not assign any last_validation_status values (e.g., simulation mode),
    // at least verify that all items returned are scoped to this cart.
    for (const item of pageResult.data) {
      TestValidator.equals(
        "cart item belongs to the requested cart when no specific status to filter",
        item.cart_id,
        cart.id,
      );
    }
  }
}
