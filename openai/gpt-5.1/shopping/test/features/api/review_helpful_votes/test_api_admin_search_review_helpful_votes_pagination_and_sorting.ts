import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewHelpfulVote";
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
import type { IShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulVote";
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

export async function test_api_admin_search_review_helpful_votes_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and login admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Register and login seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 3. Register and login primary customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 4. Admin master data: country, region, shipping method, payment method, SKU inventory state
  const countryCreateBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
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
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Credit card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Items are in stock and purchasable",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 5. Seller creates product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer login and address creation
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "Los Angeles",
    postal_code: "90001",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  // 7. Cart, cart item, and order
  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  const shippingAddressSnapshotCreateBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreateBody],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingAddressSnapshotCreateBody,
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

  // 8. Create multiple reviews
  const reviewBodies: IShoppingMallReview.ICreate[] = [
    {
      rating: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>,
      title: "Great",
      body: "Great product",
    },
    {
      rating: 4 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>,
      title: "Good",
      body: "Good product",
    },
  ];

  const reviews: IShoppingMallReview[] = [];
  for (const rb of reviewBodies) {
    const review = await api.functional.shoppingMall.customer.reviews.create(
      connection,
      {
        body: rb,
      },
    );
    typia.assert(review);
    reviews.push(review);
  }

  // 9. Create multiple helpful votes from primary customer
  const helpfulVotes: IShoppingMallReviewHelpfulVote[] = [];
  for (let i = 0; i < 8; i++) {
    const vote =
      await api.functional.shoppingMall.customer.reviewHelpfulVotes.create(
        connection,
        {
          body: {
            is_helpful: i % 2 === 0,
          } satisfies IShoppingMallReviewHelpfulVote.ICreate,
        },
      );
    typia.assert(vote);
    helpfulVotes.push(vote);
  }

  // Also create review-scoped helpful votes
  for (const review of reviews) {
    const vote =
      await api.functional.shoppingMall.customer.reviews.helpfulVotes.create(
        connection,
        {
          reviewId: review.id,
          body: {
            is_helpful: true,
          } satisfies IShoppingMallReviewHelpfulVote.ICreate,
        },
      );
    typia.assert(vote);
    helpfulVotes.push(vote);
  }

  // 10. Customer-scoped helpful votes
  for (let i = 0; i < 3; i++) {
    const vote =
      await api.functional.shoppingMall.customer.customers.helpfulVotes.create(
        connection,
        {
          customerId: customer.id,
          body: {
            is_helpful: true,
          } satisfies IShoppingMallReviewHelpfulVote.ICreate,
        },
      );
    typia.assert(vote);
    helpfulVotes.push(vote);
  }

  TestValidator.predicate(
    "created helpful votes count >= 10",
    helpfulVotes.length >= 10,
  );

  // 11. Admin: login again and search with pagination + sorting
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const requestDescPage1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
    reviewId: undefined,
    customerId: undefined,
    isHelpful: undefined,
    createdFrom: undefined,
    createdTo: undefined,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;

  const page1: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.admin.reviewHelpfulVotes.index(
      connection,
      {
        body: requestDescPage1,
      },
    );
  typia.assert(page1);

  const requestDescPage2 = {
    page: 2 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;

  const page2: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.admin.reviewHelpfulVotes.index(
      connection,
      {
        body: requestDescPage2,
      },
    );
  typia.assert(page2);

  // Basic pagination metadata assertions
  const fetchedCount = page1.data.length + page2.data.length;
  TestValidator.predicate(
    "records >= fetched rows",
    page1.pagination.records >= fetchedCount,
  );
  TestValidator.predicate(
    "pages computed from records and limit",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );

  // Verify page sizes and non-overlap
  TestValidator.predicate("page1 length <= 5", page1.data.length <= 5);
  TestValidator.predicate("page2 length <= 5", page2.data.length <= 5);

  const idsPage1 = page1.data.map((v) => v.id);
  const idsPage2 = page2.data.map((v) => v.id);
  const overlap = idsPage1.filter((id) => idsPage2.includes(id));
  TestValidator.predicate(
    "no overlap between page1 and page2",
    overlap.length === 0,
  );

  // Verify descending created_at ordering across first two pages
  const allDesc = [...page1.data, ...page2.data];
  for (let i = 1; i < allDesc.length; i++) {
    const prev = allDesc[i - 1].created_at;
    const curr = allDesc[i].created_at;
    TestValidator.predicate(
      `created_at desc order at index ${i}`,
      prev >= curr,
    );
  }

  // Ascending sort check
  const requestAscPage1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "asc",
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;

  const ascPage1: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.admin.reviewHelpfulVotes.index(
      connection,
      {
        body: requestAscPage1,
      },
    );
  typia.assert(ascPage1);

  for (let i = 1; i < ascPage1.data.length; i++) {
    const prev = ascPage1.data[i - 1].created_at;
    const curr = ascPage1.data[i].created_at;
    TestValidator.predicate(`created_at asc order at index ${i}`, prev <= curr);
  }

  if (page1.data.length > 0 && ascPage1.data.length > 0) {
    const newestDesc = page1.data[0].created_at;
    const oldestAsc = ascPage1.data[0].created_at;
    TestValidator.predicate(
      "oldest asc <= newest desc",
      oldestAsc <= newestDesc,
    );
  }

  // Optional filter by customerId using one known vote
  const anyVote = helpfulVotes[0];
  const filterByCustomerRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
    customerId: anyVote.customer_id,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;

  const filteredByCustomer: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.admin.reviewHelpfulVotes.index(
      connection,
      {
        body: filterByCustomerRequest,
      },
    );
  typia.assert(filteredByCustomer);

  for (const v of filteredByCustomer.data) {
    TestValidator.equals(
      "filter by customerId",
      v.shopping_mall_customer_id,
      anyVote.customer_id,
    );
  }
}
