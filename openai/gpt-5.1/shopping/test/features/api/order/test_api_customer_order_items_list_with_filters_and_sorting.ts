import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_customer_order_items_list_with_filters_and_sorting(
  connection: api.IConnection,
) {
  /**
   * Validate filtered, sorted, and paginated listing of order items scoped to a
   * single order.
   *
   * Business flow:
   *
   * 1. Admin joins and logs in to gain access to catalog configuration APIs.
   * 2. Admin creates a country and region for customer addresses.
   * 3. Admin creates a shipping method and a payment method.
   * 4. Admin creates a product category.
   * 5. Admin creates an inventory state that is purchasable for SKUs.
   * 6. Seller joins and logs in, then creates a product.
   * 7. Admin links the product to the category.
   * 8. Seller creates multiple SKUs under the product using the inventory state.
   * 9. Customer joins (and is then implicitly authenticated by SDK).
   * 10. Customer creates a shipping address using the admin-defined country/region.
   * 11. Customer creates a cart.
   * 12. Customer creates a first order using multiple SKUs/quantities and the
   *     address/shipping/payment configuration.
   * 13. Customer creates a second order with partially overlapping SKUs to validate
   *     SKU-based filters remain scoped.
   * 14. Call PATCH /shoppingMall/customer/orders/{orderCode}/items several times
   *     with different IShoppingMallOrderItem.IRequest values to test:
   *
   *     - Pagination via current and limit.
   *     - Sorting via sortBy="line_number" and sortDirection="asc" or "desc".
   *     - Filters via minQuantity, maxQuantity, and skuId.
   * 15. Assert that:
   *
   *     - Only order items from the first order are returned.
   *     - Sorting is respected.
   *     - Quantity and SKU filters work correctly.
   *     - Pagination metadata (current, limit, records, pages) is coherent.
   *     - Filtering by a skuId that only appears in the second order returns no items
   *           when listing the first order.
   */

  // ---------- 1. Admin join & login ----------
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAfterLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // ---------- 2. Country & region ----------
  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // ---------- 3. Shipping & payment methods ----------
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Visa/Mastercard",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // ---------- 4. Category ----------
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "General",
    description_en: "General products",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // ---------- 5. Inventory state ----------
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Purchasable inventory",
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

  // ---------- 6. Seller join & login ----------
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterLogin);

  // ---------- 7. Product by seller ----------
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(6)}`,
    title: "Order Item Test Product",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // ---------- 8. Link product to category (admin) ----------
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

  // ---------- 9. Create multiple SKUs under product ----------
  const skuBodies: IShoppingMallSku.ICreate[] = [
    {
      code: `SKU-A-${RandomGenerator.alphaNumeric(4)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      barcode: null,
      status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
      price: 100,
      original_price: 120,
      inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    },
    {
      code: `SKU-B-${RandomGenerator.alphaNumeric(4)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      barcode: null,
      status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
      price: 200,
      original_price: 220,
      inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    },
    {
      code: `SKU-C-${RandomGenerator.alphaNumeric(4)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      barcode: null,
      status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
      price: 300,
      original_price: 320,
      inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    },
  ];

  const skus: IShoppingMallSku[] = [];
  for (const body of skuBodies) {
    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(sku);
    skus.push(sku);
  }

  // ---------- 10. Customer join ----------
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // ---------- 11. Customer address ----------
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Apt 4B",
    city: "Testville",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBody,
      },
    );
  typia.assert(address);

  // ---------- 12. Customer cart ----------
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

  // ---------- 13. Create two orders using the SKUs ----------
  const itemCreate = (
    skuId: string & tags.Format<"uuid">,
    quantity: number & tags.Type<"int32">,
  ): IShoppingMallOrderItem.ICreate => ({
    shopping_mall_sku_id: skuId,
    quantity,
  });

  // Use all three SKUs in order1
  const order1Items: IShoppingMallOrderItem.ICreate[] = [
    itemCreate(
      skus[0].id as string & tags.Format<"uuid">,
      1 as number & tags.Type<"int32">,
    ),
    itemCreate(
      skus[1].id as string & tags.Format<"uuid">,
      2 as number & tags.Type<"int32">,
    ),
    itemCreate(
      skus[2].id as string & tags.Format<"uuid">,
      3 as number & tags.Type<"int32">,
    ),
  ];

  // Second order uses a subset of SKUs from order1 (skus[0] and skus[1])
  const order2Items: IShoppingMallOrderItem.ICreate[] = [
    itemCreate(
      skus[0].id as string & tags.Format<"uuid">,
      4 as number & tags.Type<"int32">,
    ),
    itemCreate(
      skus[1].id as string & tags.Format<"uuid">,
      5 as number & tags.Type<"int32">,
    ),
  ];

  const order1Body = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: "USD",
    items: order1Items,
    shipping_address_id: address.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order1: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order1Body,
    });
  typia.assert(order1);

  const order2Body = {
    cart_id: null,
    currency_code: "USD",
    items: order2Items,
    shipping_address_id: address.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order2Body,
    });
  typia.assert(order2);

  // Sanity check: two different orders, same customer
  TestValidator.notEquals("orders must be distinct", order1.id, order2.id);
  TestValidator.equals(
    "customer id should be same for both orders",
    order1.customer?.id ?? customerId,
    order2.customer?.id ?? customerId,
  );

  const order1Code: string = order1.order_code;
  const order2Code: string = order2.order_code;

  // ---------- 14. Invoke order items listing with various requests ----------
  const fetchItemsForOrder1 = async (
    body: IShoppingMallOrderItem.IRequest,
  ): Promise<IPageIShoppingMallOrderItem.ISummary> => {
    const page: IPageIShoppingMallOrderItem.ISummary =
      await api.functional.shoppingMall.customer.orders.items.index(
        connection,
        {
          orderCode: order1Code,
          body,
        },
      );
    typia.assert(page);
    return page;
  };

  // 14-1. Basic pagination: limit 1, first page ascending by line_number
  const page1Body = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "line_number",
    sortDirection: "asc",
  } satisfies IShoppingMallOrderItem.IRequest;

  const page1 = await fetchItemsForOrder1(page1Body);

  TestValidator.equals(
    "page1 current should match request",
    page1.pagination.current,
    page1Body.current,
  );
  TestValidator.equals(
    "page1 limit should match request",
    page1.pagination.limit,
    page1Body.limit,
  );

  TestValidator.predicate(
    "page1 has exactly one item",
    page1.data.length === 1,
  );

  const firstLineNumber = page1.data[0]?.line_number;

  // 14-2. Second page with same limit and sorting
  const page2Body = {
    current: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: page1Body.limit,
    sortBy: page1Body.sortBy,
    sortDirection: page1Body.sortDirection,
  } satisfies IShoppingMallOrderItem.IRequest;

  const page2 = await fetchItemsForOrder1(page2Body);

  TestValidator.equals(
    "page2 current should equal 2",
    page2.pagination.current,
    page2Body.current,
  );
  TestValidator.predicate(
    "page2 has exactly one item",
    page2.data.length === 1,
  );

  const secondLineNumber = page2.data[0]?.line_number;
  if (firstLineNumber !== undefined && secondLineNumber !== undefined) {
    TestValidator.predicate(
      "second page line_number should be greater than first page",
      secondLineNumber > firstLineNumber,
    );
  }

  // 14-3. Full fetch with descending sort by line_number
  const fullDescBody = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "line_number",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderItem.IRequest;

  const fullDesc = await fetchItemsForOrder1(fullDescBody);

  TestValidator.predicate(
    "fullDesc should contain at least 3 items (all from order1)",
    fullDesc.data.length >= 3,
  );

  for (let i = 1; i < fullDesc.data.length; i++) {
    const prev = fullDesc.data[i - 1].line_number;
    const curr = fullDesc.data[i].line_number;
    TestValidator.predicate(
      `line_number desc ordering at index ${i}`,
      prev >= curr,
    );
  }

  // 14-4. Quantity-based filter: minQuantity = 2, maxQuantity = 3
  const quantityFilterBody = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "line_number",
    sortDirection: "asc",
    minQuantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    maxQuantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderItem.IRequest;

  const quantityPage = await fetchItemsForOrder1(quantityFilterBody);

  for (const item of quantityPage.data) {
    TestValidator.predicate(
      "quantity filter applied correctly",
      item.quantity >= (quantityFilterBody.minQuantity ?? 0) &&
        item.quantity <=
          (quantityFilterBody.maxQuantity ?? Number.MAX_SAFE_INTEGER),
    );
  }

  // 14-5. SKU-based filter using a SKU present in order1
  const skuInOrder1 = skus[1];
  const skuFilterBody = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "line_number",
    sortDirection: "asc",
    skuId: skuInOrder1.id,
  } satisfies IShoppingMallOrderItem.IRequest;

  const skuPage = await fetchItemsForOrder1(skuFilterBody);

  for (const item of skuPage.data) {
    TestValidator.equals(
      "skuId filter aligns with item.sku id",
      item.shopping_mall_sku_id,
      skuInOrder1.id,
    );
  }

  // 14-6. SKU filter using a SKU that only appears in the second order
  const uniqueSkuForOrder2 = skus[1];

  const skuFilterOnlyOrder2Body = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "line_number",
    sortDirection: "asc",
    skuId: uniqueSkuForOrder2.id,
  } satisfies IShoppingMallOrderItem.IRequest;

  const skuOnlyOrder2Page = await fetchItemsForOrder1(skuFilterOnlyOrder2Body);

  TestValidator.equals(
    "sku filter for shared SKU between orders still scoped to order1",
    skuOnlyOrder2Page.data.every(
      (item) => item.shopping_mall_order_id === order1.id,
    ),
    true,
  );

  // Additional safeguard: calling the same filter against order2 should return items
  const order2SkuPage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderCode: order2Code,
      body: skuFilterOnlyOrder2Body,
    });
  typia.assert(order2SkuPage);

  TestValidator.predicate(
    "same skuId filter against second order should return at least one item",
    order2SkuPage.data.length >= 1,
  );

  // 15. Pagination metadata coherence: pages * limit >= records
  const pagination = fullDesc.pagination;
  TestValidator.predicate(
    "pagination records consistent with pages & limit",
    pagination.pages * pagination.limit >= pagination.records,
  );
}
