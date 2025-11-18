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

export async function test_api_seller_dispute_creation_for_payment_chargeback(
  connection: api.IConnection,
) {
  // 1. Join all actors
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "Customer123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://customer.join" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Seller123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://seller.join" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.join" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 2. As admin, create master data
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Admin123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.login" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: "KR",
        name_en: "Korea",
        phone_code: "+82",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphaNumeric(8),
        name_en: RandomGenerator.name(2),
        description_en: RandomGenerator.paragraph({ sentences: 5 }),
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "Available for purchase",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "standard",
        display_name: "Standard Shipping",
        service_level_description: "3-5 business days",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card",
        display_name: "Credit Card",
        description: "Generic card",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. As seller, create product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Seller123!",
      ip: null,
      href: "https://seller.login" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "BrandX",
        model_name: "ModelY",
        status: "active",
        primary_image_uri: "https://example.com/image.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // Link product to category as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Admin123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.login2" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const productCategory =
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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // Back to seller for SKU creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Seller123!",
      ip: null,
      href: "https://seller.login2" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: RandomGenerator.alphaNumeric(10) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: null,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 4. Customer login, cart, address, order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "Customer123!",
      ip: null,
      href: "https://customer.login" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert<IShoppingMallCart>(cart);

  const address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerJoin.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: null,
          recipient_name: RandomGenerator.name(2),
          line1: "Address line 1",
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: cart.id,
        currency_code: "KRW",
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: address.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  // 5. Create order payment as customer
  const payableAmount = 100;
  const orderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method_id: paymentMethod.id,
          currency_code: order.currency_code,
          payable_amount: payableAmount,
          provider_reference: null,
          provider_status_code: null,
          metadata: null,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 6. Create chargeback as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Admin123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.login3" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const chargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        body: {
          currency_code: orderPayment.currency_code,
          disputed_amount: payableAmount,
          chargeback_amount: payableAmount,
          reason_code: "fraud",
          status: "open",
          stage: "first_presentment",
          provider_reference: RandomGenerator.alphaNumeric(12),
          metadata: undefined,
        } satisfies IShoppingMallPaymentChargeback.ICreate,
      },
    );
  typia.assert<IShoppingMallPaymentChargeback>(chargeback);
  TestValidator.equals(
    "chargeback.orderPayment.id should match orderPayment.id",
    chargeback.orderPayment?.id,
    orderPayment.id,
  );

  // 7. Seller creates dispute referencing the chargeback
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Seller123!",
      ip: null,
      href: "https://seller.login3" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const disputeCreateBody = {
    dispute_code: null,
    type: "payment_chargeback",
    severity: "high",
    summary: "Chargeback dispute for order payment",
    description: "Seller disputes the chargeback as fraudulent claim.",
    opened_at: null,
    shopping_mall_order_id: order.id,
    shopping_mall_refund_request_id: null,
    shopping_mall_payment_chargeback_id: chargeback.id,
    shopping_mall_risk_case_id: null,
  } satisfies IShoppingMallDispute.ICreate;

  const dispute = await api.functional.shoppingMall.seller.disputes.create(
    connection,
    {
      body: disputeCreateBody,
    },
  );
  typia.assert<IShoppingMallDispute>(dispute);

  TestValidator.equals(
    "dispute.order.id should match order.id",
    dispute.order?.id,
    order.id,
  );
  TestValidator.equals(
    "dispute.paymentChargeback.id should match chargeback.id",
    dispute.paymentChargeback?.id,
    chargeback.id,
  );

  // 8. Negative case: non-seller (admin) cannot create seller dispute on same chargeback
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Admin123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.login4" as string & tags.Format<"uri">,
      referrer: "https://referrer" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  await TestValidator.error(
    "non-seller cannot open seller dispute for chargeback",
    async () => {
      await api.functional.shoppingMall.seller.disputes.create(connection, {
        body: disputeCreateBody,
      });
    },
  );
}
