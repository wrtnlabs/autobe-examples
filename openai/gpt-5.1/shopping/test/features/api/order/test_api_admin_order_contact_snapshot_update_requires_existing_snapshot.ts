import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IShoppingMallOrderCustomerContact } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCustomerContact";
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

export async function test_api_admin_order_contact_snapshot_update_requires_existing_snapshot(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a customer
  const customerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@customer.test`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://frontend.test/customer/join",
    referrer: "https://frontend.test/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Create and authenticate a seller
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.test`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://frontend.test/seller/join",
    referrer: "https://frontend.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Create and authenticate an admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://frontend.test/admin/join",
    referrer: "https://frontend.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. As admin, create country
  const countryCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Testland",
    phone_code: "+999",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 5. As admin, create region under that country
  const regionCreateBody = {
    code: "TST-REGION",
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 6. As admin, create a shipping method
  const shippingMethodBody = {
    method_code: `ship_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  // 7. As admin, create a payment method
  const paymentMethodBody = {
    code: `pay_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: "Test payment method",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: country.country_code,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 8. As admin, create a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category for E2E test",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 9. As admin, create an inventory state
  const inventoryStateBody = {
    code: `state_${RandomGenerator.alphaNumeric(5)}`,
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

  // 10. Switch to seller and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://frontend.test/seller/login",
      referrer: "https://frontend.test/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBody = {
    code: `prd_${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Product",
    summary: "Short summary",
    description: "Long description for test product",
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://cdn.test/images/product.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 11. As admin, associate product with category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://frontend.test/admin/login",
      referrer: "https://frontend.test/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
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

  // 12. Switch again to seller to create SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://frontend.test/seller/login",
      referrer: "https://frontend.test/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuBody = {
    code: `sku_${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10,
    low_stock_threshold: 1,
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

  // 13. Switch to customer to create address, cart, and order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://frontend.test/customer/login",
      referrer: "https://frontend.test/login",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Recipient",
    line1: "123 Test Street",
    line2: null,
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile("010"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: customerAddressBody,
      },
    );
  typia.assert(address);

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

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: address.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  const orderCode = order.order_code;

  // 14. Switch to admin for contact snapshot operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://frontend.test/admin/login",
      referrer: "https://frontend.test/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  // 15. Scenario A: PUT before POST should fail
  const firstUpdateBody = {
    contact_name: "Admin Updated Name",
    contact_email: "updated1@example.test",
    contact_phone: null,
  } satisfies IShoppingMallOrderCustomerContact.IUpdate;

  await TestValidator.error(
    "PUT customerContact should fail when snapshot does not exist",
    async () => {
      await api.functional.shoppingMall.admin.orders.customerContact.update(
        connection,
        {
          orderCode,
          body: firstUpdateBody,
        },
      );
    },
  );

  // 16. Scenario B: POST then PUT should succeed
  const initialSnapshotBody = {
    contact_name: "Initial Name",
    contact_email: "initial@example.test",
    contact_phone: RandomGenerator.mobile("010"),
  } satisfies IShoppingMallOrderCustomerContact.ICreate;
  const initialSnapshot: IShoppingMallOrderCustomerContact =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      orderCode,
      body: initialSnapshotBody,
    });
  typia.assert(initialSnapshot);

  const secondUpdateBody = {
    contact_name: "Second Updated Name",
    contact_email: "updated2@example.test",
    contact_phone: null,
  } satisfies IShoppingMallOrderCustomerContact.IUpdate;
  const updatedSnapshot: IShoppingMallOrderCustomerContact =
    await api.functional.shoppingMall.admin.orders.customerContact.update(
      connection,
      {
        orderCode,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedSnapshot);

  // Validate that the updated snapshot reflects the PUT body
  TestValidator.equals(
    "updated contact_name should match secondUpdateBody",
    updatedSnapshot.contact_name,
    secondUpdateBody.contact_name,
  );
  TestValidator.equals(
    "updated contact_email should match secondUpdateBody",
    updatedSnapshot.contact_email,
    secondUpdateBody.contact_email,
  );
  TestValidator.equals(
    "updated contact_phone should match secondUpdateBody",
    updatedSnapshot.contact_phone,
    secondUpdateBody.contact_phone,
  );

  // Ensure updated_at is not earlier than created_at
  TestValidator.predicate(
    "updated_at should be same or after created_at",
    new Date(updatedSnapshot.updated_at).getTime() >=
      new Date(updatedSnapshot.created_at).getTime(),
  );
}
