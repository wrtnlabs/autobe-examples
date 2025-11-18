import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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

export async function test_api_admin_cancellation_request_erase_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Customer registration (join)
  const customerEmail = `customer+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customerPassword = "CustomerP@ssw0rd";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  // 2. Seller registration (join)
  const sellerEmail = `seller+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerPassword = "SellerP@ssw0rd";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  // 3. Admin registration (join)
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "AdminP@ssw0rd";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // Helper to login as specific roles when we need to switch context
  const loginAsAdmin = async () => {
    const body = {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate;
    const result = await api.functional.auth.admin.login(connection, { body });
    typia.assert<IShoppingMallAdmin.IAuthorized>(result);
  };

  const loginAsCustomer = async () => {
    const body = {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://customer.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://customer.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest;
    const result = await api.functional.auth.customer.login(connection, {
      body,
    });
    typia.assert<IShoppingMallCustomer.IAuthorized>(result);
  };

  const loginAsSeller = async () => {
    const body = {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest;
    const result = await api.functional.auth.seller.login(connection, { body });
    typia.assert<IShoppingMallSeller.IAuthorized>(result);
  };

  // 4. As admin: create master data (country, region, shipping method, payment method, category)
  await loginAsAdmin();

  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "metropolitan",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const shippingMethodCreateBody = {
    method_code: `standard-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreateBody = {
    code: `card-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Credit Card",
    description: "Default card method",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "General",
    description_en: null,
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. As seller: create product
  await loginAsSeller();

  const productCreateBody = {
    code: `prod-${RandomGenerator.alphaNumeric(6)}`,
    title: "Sample Product",
    summary: "Sample summary",
    description: "Detailed description",
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5.b As admin: link product to category
  await loginAsAdmin();

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

  // 5.c As admin: create SKU inventory state
  const skuInventoryStateCreateBody = {
    code: `in_stock-${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Regular stock",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 5.d As seller: create SKU for the product
  await loginAsSeller();

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 6. As customer: create cart, cart item, address, and order
  await loginAsCustomer();

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Customer Recipient",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "00000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [orderItemCreateBody],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver quickly",
    platform_note: "test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 7. As customer: create cancellation request for the order
  const cancellationCreateBody = {
    shopping_mall_order_id: order.id,
    request_code: `CR-${RandomGenerator.alphaNumeric(6)}`,
    status: "pending",
    scope_type: "full_order",
    reason_code: null,
    reason_description: "Customer requested cancellation",
    requested_at: null,
    requested_by_actor_type: "customer",
  } satisfies IShoppingMallCancellationRequest.ICreate;

  const cancellation: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.create(
      connection,
      {
        body: cancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallCancellationRequest>(cancellation);

  // 8. Attempt unauthorized erase as customer
  await TestValidator.error(
    "customer cannot erase admin cancellation request",
    async () => {
      await api.functional.shoppingMall.admin.cancellationRequests.erase(
        connection,
        {
          cancellationRequestId: cancellation.id,
        },
      );
    },
  );

  // Verify still exists via admin
  await loginAsAdmin();
  const fetchedAfterCustomer: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.admin.cancellationRequests.at(
      connection,
      {
        cancellationRequestId: cancellation.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert<IShoppingMallCancellationRequest>(fetchedAfterCustomer);
  TestValidator.equals(
    "cancellation still present after customer unauthorized erase",
    fetchedAfterCustomer.id,
    cancellation.id,
  );

  // 9. Attempt unauthorized erase as seller
  await loginAsSeller();
  await TestValidator.error(
    "seller cannot erase admin cancellation request",
    async () => {
      await api.functional.shoppingMall.admin.cancellationRequests.erase(
        connection,
        {
          cancellationRequestId: cancellation.id,
        },
      );
    },
  );

  // Verify still exists via admin again
  await loginAsAdmin();
  const fetchedAfterSeller: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.admin.cancellationRequests.at(
      connection,
      {
        cancellationRequestId: cancellation.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert<IShoppingMallCancellationRequest>(fetchedAfterSeller);
  TestValidator.equals(
    "cancellation still present after seller unauthorized erase",
    fetchedAfterSeller.id,
    cancellation.id,
  );

  // 10. Authorized erase as admin
  await api.functional.shoppingMall.admin.cancellationRequests.erase(
    connection,
    {
      cancellationRequestId: cancellation.id as string & tags.Format<"uuid">,
    },
  );

  // Verify removal via index search filtered by orderId
  const listBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: undefined,
    requestedByActorType: undefined,
    orderId: order.id,
    customerId: undefined,
    sellerId: undefined,
    adminId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallCancellationRequest.IRequest;

  const page: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      connection,
      {
        body: listBody,
      },
    );
  typia.assert<IPageIShoppingMallCancellationRequest.ISummary>(page);

  const exists = ArrayUtil.has(page.data, (r) => r.id === cancellation.id);
  TestValidator.predicate(
    "erased cancellation should not appear in admin search",
    exists === false,
  );
}
