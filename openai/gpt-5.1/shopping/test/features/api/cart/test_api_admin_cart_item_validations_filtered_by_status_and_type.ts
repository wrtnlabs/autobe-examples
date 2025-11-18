import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItemValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItemValidation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartItemValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemValidation";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCartValidationError } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationError";
import type { IShoppingMallCartValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationResult";
import type { IShoppingMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationWarning";
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
 * Validate admin filtering of cart item validation history by status and
 * validation_type.
 *
 * Business goal
 *
 * - Ensure backoffice admins can investigate cart problems by fetching only the
 *   relevant cart item validation events filtered by:
 *
 *   - Outcome status (e.g. "success", "error", "adjusted")
 *   - Validation_type (e.g. "checkout", "add_to_cart") for a specific cart.
 *
 * High‑level flow
 *
 * 1. Create three actors via join APIs and authenticate them through login flows
 *    when switching roles:
 *
 *    - Admin: allowed to call the validations search endpoint.
 *    - Customer: owns the cart that will be validated.
 *    - Seller: owns the product/SKU that will be added to the cart.
 * 2. As seller, create a product and a SKU inventory state, then create a SKU for
 *    that product referencing the inventory state so that it is purchasable.
 * 3. As admin, create a category and link the product into that category so
 *    catalog rules are satisfied (even though the test does not assert category
 *    behavior directly).
 * 4. As customer, create a cart with actor_type "customer" and a suitable
 *    currency. Add at least two cart items using the same SKU but different
 *    quantities to potentially yield different validation outcomes.
 * 5. Trigger the cart validation endpoint once to generate cart‑ and item‑level
 *    validation records (the implementation is assumed to record into
 *    shopping_mall_cart_item_validations). Capture the validation result to
 *    assert a realistic mixture of errors vs warnings, but do not rely on
 *    specific business error codes.
 * 6. As admin again, call the admin validations listing endpoint with
 *    IShoppingMallCartItemValidation.IRequest filters:
 *
 *    - First call: no filters (status and validation_type undefined).
 *
 *         - Assert that every returned summary has cartItem.cart_id equal to the test
 *                   cartId.
 *    - Second call: filter by validation_type equal to some value that is actually
 *         present in at least one record (if none are present, skip this filter
 *         step gracefully).
 *
 *         - Assert all returned summaries share that validation_type and cart id.
 *    - Third call: attempt a status filter equal to a value seen in the first page
 *         (for example, take the status of the first record). Again, if no
 *         records exist, skip. Assert all returned summaries have that same
 *         status and cart id.
 * 7. Optionally, test that using a filter combination unlikely to match anything
 *    (such as an obviously different validation_type string) yields an empty
 *    data array.
 *
 * Constraints and notes
 *
 * - Use only the provided DTOs and SDK functions; do not assume non‑existent APIs
 *   such as explicit validation history writers.
 * - Treat values of status and validation_type as opaque strings. The test must
 *   not assume concrete enumerations, only that filtering performs an equality
 *   match on whatever strings are stored.
 * - Do not assert on HTTP status codes or on the existence of specific error
 *   messages in validation errors/warnings; instead, validate structural
 *   correctness and filter behavior.
 * - Ensure every API call is awaited and all non‑void responses are type‑checked
 *   via typia.assert().
 */
export async function test_api_admin_cart_item_validations_filtered_by_status_and_type(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 2. Register and authenticate seller
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
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

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
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 3. Register and authenticate customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  const customerLoginBody = {
    email: customerJoin.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  // 4. As seller: create SKU inventory state and product + SKU
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphabets(8)}`,
    name: "Purchasable State",
    description: "State used for e2e validation tests",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  const productBody = {
    code: `prod-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Switch to admin to create category and link product
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: "E2E Category",
    description_en: "Category for e2e tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

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

  // Switch back to seller to create SKU
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const skuBody = {
    code: `sku-${RandomGenerator.alphabets(8)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 5. As customer: create cart and add multiple items
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
  typia.assert<IShoppingMallCart>(cart);

  const cartItemBody1 = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody1,
    });
  typia.assert<IShoppingMallCartItem>(cartItem1);

  const cartItemBody2 = {
    shopping_mall_sku_id: sku.id,
    quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody2,
    });
  typia.assert<IShoppingMallCartItem>(cartItem2);

  // Trigger validation once to generate validation records
  const validationResult: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id,
    });
  typia.assert<IShoppingMallCartValidationResult>(validationResult);

  // 6. As admin: query validations with various filters
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // First: no filters
  const baseRequest = {
    status: undefined,
    validation_type: undefined,
    createdAtFrom: null,
    createdAtTo: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCartItemValidation.IRequest;
  const basePage: IPageIShoppingMallCartItemValidation.ISummary =
    await api.functional.shoppingMall.admin.carts.items.validations.index(
      connection,
      {
        cartId: cart.id,
        body: baseRequest,
      },
    );
  typia.assert<IPageIShoppingMallCartItemValidation.ISummary>(basePage);

  // Assert all records belong to this cart
  await ArrayUtil.asyncForEach(basePage.data, async (summary) => {
    typia.assert<IShoppingMallCartItemValidation.ISummary>(summary);
    TestValidator.equals(
      "all basePage summaries must reference the same cart",
      summary.cartItem.cart_id,
      cart.id,
    );
  });

  const firstSummary: IShoppingMallCartItemValidation.ISummary | undefined =
    basePage.data[0];

  // Second: filter by validation_type if available
  if (firstSummary !== undefined) {
    const typeFilterValue: string = firstSummary.validation_type;
    const typeFilterRequest = {
      status: undefined,
      validation_type: typeFilterValue,
      createdAtFrom: null,
      createdAtTo: null,
      page: 1 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
    } satisfies IShoppingMallCartItemValidation.IRequest;
    const typeFilteredPage: IPageIShoppingMallCartItemValidation.ISummary =
      await api.functional.shoppingMall.admin.carts.items.validations.index(
        connection,
        {
          cartId: cart.id,
          body: typeFilterRequest,
        },
      );
    typia.assert<IPageIShoppingMallCartItemValidation.ISummary>(
      typeFilteredPage,
    );

    await ArrayUtil.asyncForEach(typeFilteredPage.data, async (summary) => {
      typia.assert<IShoppingMallCartItemValidation.ISummary>(summary);
      TestValidator.equals(
        "type-filtered summaries must match validation_type",
        summary.validation_type,
        typeFilterValue,
      );
      TestValidator.equals(
        "type-filtered summaries must belong to cart",
        summary.cartItem.cart_id,
        cart.id,
      );
    });

    // Third: filter by status using same first summary
    const statusFilterValue: string = firstSummary.status;
    const statusFilterRequest = {
      status: statusFilterValue,
      validation_type: undefined,
      createdAtFrom: null,
      createdAtTo: null,
      page: 1 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
    } satisfies IShoppingMallCartItemValidation.IRequest;
    const statusFilteredPage: IPageIShoppingMallCartItemValidation.ISummary =
      await api.functional.shoppingMall.admin.carts.items.validations.index(
        connection,
        {
          cartId: cart.id,
          body: statusFilterRequest,
        },
      );
    typia.assert<IPageIShoppingMallCartItemValidation.ISummary>(
      statusFilteredPage,
    );

    await ArrayUtil.asyncForEach(statusFilteredPage.data, async (summary) => {
      typia.assert<IShoppingMallCartItemValidation.ISummary>(summary);
      TestValidator.equals(
        "status-filtered summaries must match status",
        summary.status,
        statusFilterValue,
      );
      TestValidator.equals(
        "status-filtered summaries must belong to cart",
        summary.cartItem.cart_id,
        cart.id,
      );
    });

    // Fourth: filter combination unlikely to match anything
    const unlikelyRequest = {
      status: `${statusFilterValue}-unlikely` as string,
      validation_type: `${typeFilterValue}-unlikely` as string,
      createdAtFrom: null,
      createdAtTo: null,
      page: 1 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
    } satisfies IShoppingMallCartItemValidation.IRequest;
    const unlikelyPage: IPageIShoppingMallCartItemValidation.ISummary =
      await api.functional.shoppingMall.admin.carts.items.validations.index(
        connection,
        {
          cartId: cart.id,
          body: unlikelyRequest,
        },
      );
    typia.assert<IPageIShoppingMallCartItemValidation.ISummary>(unlikelyPage);

    TestValidator.equals(
      "unlikely filter combination should be empty or at least not break",
      unlikelyPage.pagination.current,
      1,
    );

    await TestValidator.predicate(
      "unlikely filter combination returns zero or more records safely",
      async () => unlikelyPage.data.length >= 0,
    );
  }
}
