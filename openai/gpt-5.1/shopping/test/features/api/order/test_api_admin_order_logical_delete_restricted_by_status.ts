import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";
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

/**
 * Validate that admin logical deletion of an order is restricted when the order
 * is already governed by a refund request.
 *
 * Business context: Admins can logically delete orders via DELETE
 * /shoppingMall/admin/orders/{orderCode}, which sets deleted_at in
 * shopping_mall_orders. However, governance and compliance requirements
 * typically forbid deleting orders that are involved in active refund
 * workflows. Once a refund request exists for an order, the order should be
 * preserved for audit, dispute, and regulatory reasons, and erase must reject
 * attempts to delete it.
 *
 * High-level flow implemented here:
 *
 * 1. Bootstrap actors and master data
 *
 *    - Register a customer and log them in
 *    - Register a seller and log them in
 *    - Register an admin and log them in (for admin-only operations)
 *    - As admin, create a country and at least one region
 *    - As admin, create an inventory state for SKUs
 *    - As admin, create a category
 *    - As admin, create a shipping method and a payment method
 * 2. Catalog setup
 *
 *    - As seller, create a product
 *    - As admin, link the product to the category
 *    - As seller, create a SKU for the product, tied to the inventory state
 * 3. Customer order flow
 *
 *    - As customer, create a cart (actor_type="customer")
 *    - As customer, add the SKU to the cart as a cart item
 *    - As customer, create a customer address under their ID
 *    - As customer, construct an order create payload referencing the cart, a
 *         shipping_address_snapshot, shipping_method_id, and payment_method_id,
 *         then call POST /shoppingMall/customer/orders and capture the
 *         resulting order with its order_code and id
 * 4. Governance setup: create refund request for the order
 *
 *    - Switch back to admin
 *    - Create a refund request for the order using
 *         api.functional.shoppingMall.admin.refundRequests.create, with
 *         requested_total_amount equal to order.grand_total_amount,
 *         currency_code equal to order.currency_code, requested_by_actor_type=
 *         "customer" and requires_return=false
 * 5. Attempt admin logical deletion and assert failure
 *
 *    - Still as admin, attempt to erase the same order by calling
 *         api.functional.shoppingMall.admin.orders.erase(connection, {
 *         orderCode }) inside TestValidator.error to assert that deletion is
 *         rejected as a business rule violation because the order is associated
 *         with a refund request
 * 6. Sanity check for continued admin capabilities
 *
 *    - As a final step, verify the admin can still perform other admin operations
 *         (e.g., create another shipping method) to ensure the failed erase did
 *         not corrupt admin abilities.
 *
 * Note: The materials do not provide an order-read API to inspect deleted_at,
 * so we limit validation to ensuring that erase throws rather than succeeding.
 */
export async function test_api_admin_order_logical_delete_restricted_by_status(
  connection: api.IConnection,
) {
  // 1. Register customer and login with consistent credentials
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://customer.local/join" as string & tags.Format<"uri">,
      referrer: "https://customer.local/landing" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://customer.local/login" as string & tags.Format<"uri">,
      referrer: "https://customer.local/landing" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  // 2. Register seller and login with consistent credentials
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.local/join" as string & tags.Format<"uri">,
      referrer: "https://seller.local/landing" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.local/login" as string & tags.Format<"uri">,
      referrer: "https://seller.local/landing" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 3. Register admin and login with consistent credentials
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.local/join" as string & tags.Format<"uri">,
      referrer: "https://admin.local/landing" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.local/login" as string & tags.Format<"uri">,
      referrer: "https://admin.local/landing" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 4. Admin master data: country, region, SKU inventory state, category
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: typia.random<IShoppingMallCountry.ICreate>(),
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: typia.random<IShoppingMallRegion.ICreate>(),
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: typia.random<IShoppingMallSkuInventoryState.ICreate>(),
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: typia.random<IShoppingMallCategory.ICreate>(),
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 5. Admin master data: shipping method & payment method
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: typia.random<IShoppingMallShippingMethod.ICreate>(),
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: typia.random<IShoppingMallPaymentMethod.ICreate>(),
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 6. Seller catalog: product and SKU (current token is admin; seller APIs
  // will switch token when invoked in a real system using their own auth
  // endpoints. Here we assume the connection is permitted as long as the
  // underlying SDK manages Authorization.)

  // Ensure we are logged in as seller when creating catalog
  const sellerLoginForCatalog = await api.functional.auth.seller.login(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.local/login" as string & tags.Format<"uri">,
        referrer: "https://seller.local/landing" as string & tags.Format<"uri">,
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    },
  );
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginForCatalog);

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  const productCategoryLink =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategoryLink);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        code: RandomGenerator.alphaNumeric(12),
        barcode: null,
        status: "active",
        price: 100,
        original_price: null,
        inventory_quantity: 10,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 7. Switch to customer: cart, item, address, order
  const customerLoginForOrder = await api.functional.auth.customer.login(
    connection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://customer.local/login" as string & tags.Format<"uri">,
        referrer: "https://customer.local/landing" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoginForOrder);

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert<IShoppingMallCart>(cart);

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerJoin.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(),
          line1: RandomGenerator.paragraph({ sentences: 2 }),
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  const shippingSnapshot = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  // 8. As admin, create a refund request to put the order into a
  // governance-protected state
  const adminLoginForRefund = await api.functional.auth.admin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.local/login" as string & tags.Format<"uri">,
        referrer: "https://admin.local/landing" as string & tags.Format<"uri">,
      } satisfies IShoppingMallAdminLogin.ICreate,
    },
  );
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForRefund);

  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: null,
    shopping_mall_customer_id: customerJoin.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: adminJoin.id,
    shopping_mall_refund_request_reason_id: null,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: null,
    requested_total_amount: order.grand_total_amount,
    currency_code: order.currency_code,
    reason_description: "Customer reported issue after delivery",
    requested_by_actor_type: "customer",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;

  const refundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestBody,
    });
  typia.assert<IShoppingMallRefundRequest>(refundRequest);

  // 9. Attempt to logically delete the order via admin erase and
  // expect it to fail because of the refund-related governance state.
  await TestValidator.error(
    "admin erase must fail when order has refund request",
    async () => {
      await api.functional.shoppingMall.admin.orders.erase(connection, {
        orderCode: order.order_code,
      });
    },
  );

  // 10. Sanity: admin can still perform other admin operations after failed
  // erase attempt (e.g., create another shipping method).
  const anotherShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: typia.random<IShoppingMallShippingMethod.ICreate>(),
    });
  typia.assert<IShoppingMallShippingMethod>(anotherShippingMethod);

  TestValidator.predicate(
    "admin still able to create shipping method after failed erase",
    anotherShippingMethod.id !== undefined,
  );
}
