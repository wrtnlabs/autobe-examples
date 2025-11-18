import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewEligibility";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewEligibility";
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

export async function test_api_review_eligibility_index_after_order_creation(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://seller.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!" as string & tags.Format<"password">,
      ip: null,
      href: "https://shop.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  // 2. Admin creates country, region, shipping method, payment method, sku inventory state
  // Admin is already logged in from join, connection has admin token
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: "US",
        name_en: "United States",
        phone_code: "+1",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: "CA",
          name_en: "California",
          region_type: "state",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

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
        description: "Visa/Mastercard",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

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

  // 3. Customer login and create shipping address
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const customerId: string & tags.Format<"uuid"> = customerJoin.id;

  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: RandomGenerator.paragraph({ sentences: 2 }),
          line2: null,
          city: "San Francisco",
          postal_code: "94105",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 4. Seller login and set up product, category, sku
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!",
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphabets(8),
        name_en: "Electronics",
        description_en: "Electronics category",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "TestBrand",
        model_name: "ModelX",
        status: "active",
        primary_image_uri: "https://cdn.example.com/product.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

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

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        code: RandomGenerator.alphaNumeric(8),
        barcode: null,
        status: "active",
        price: 100,
        original_price: 120,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 5. Customer login again, create cart and cart item, then create order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

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
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: cart.id,
        currency_code: cart.currency_code,
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: cartItem.quantity,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address_id: customerAddress.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  TestValidator.predicate(
    "order should have at least one item",
    order.items.length > 0,
  );

  const orderItem: IShoppingMallOrderItem = order.items[0];
  typia.assert<IShoppingMallOrderItem>(orderItem);

  // Ensure order has customer summary
  TestValidator.predicate(
    "order must have a customer summary",
    order.customer !== null,
  );
  const orderCustomer = order.customer;
  typia.assert<IShoppingMallCustomer.ISummary>(orderCustomer!);

  // 7. Query review eligibilities for this order item as the owning customer
  const eligibilityRequest = {
    customer_id: null,
    product_id: null,
    sku_id: null,
    order_item_id: null,
    status: null,
    eligible_from_from: null,
    eligible_from_to: null,
    eligible_until_from: null,
    eligible_until_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const pageForOwner =
    await api.functional.shoppingMall.customer.orderItems.reviewEligibilities.index(
      connection,
      {
        orderItemId: orderItem.id,
        body: eligibilityRequest,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(pageForOwner);

  TestValidator.predicate(
    "pagination current page should be 1",
    pageForOwner.pagination.current === 1,
  );

  if (pageForOwner.data.length > 0) {
    for (const eligibility of pageForOwner.data) {
      typia.assert<IShoppingMallReviewEligibility.ISummary>(eligibility);
      TestValidator.equals(
        "eligibility customer id must match order customer",
        eligibility.customer.id,
        orderCustomer!.id,
      );
      TestValidator.equals(
        "eligibility product id should match product",
        eligibility.product.id,
        product.id,
      );
      if (eligibility.sku !== undefined && eligibility.sku !== null) {
        TestValidator.equals(
          "eligibility sku id should match order item sku",
          eligibility.sku.id,
          orderItem.sku.id,
        );
      }
    }
  }

  // 9. Negative check: another customer should not see these eligibilities
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();

  const otherCustomerJoin = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: otherCustomerEmail,
        password: "OtherCustomerPass123!" as string & tags.Format<"password">,
        ip: null,
        href: "https://shop.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://shop.example.com" as string & tags.Format<"uri">,
      } satisfies IShoppingMallCustomerJoin.IRequest,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(otherCustomerJoin);

  const otherEligibilityPage =
    await api.functional.shoppingMall.customer.orderItems.reviewEligibilities.index(
      connection,
      {
        orderItemId: orderItem.id,
        body: eligibilityRequest,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(
    otherEligibilityPage,
  );

  if (otherEligibilityPage.data.length > 0) {
    for (const eligibility of otherEligibilityPage.data) {
      TestValidator.notEquals(
        "other customer must not see original customer eligibilities",
        eligibility.customer.id,
        orderCustomer!.id,
      );
    }
  }
}
