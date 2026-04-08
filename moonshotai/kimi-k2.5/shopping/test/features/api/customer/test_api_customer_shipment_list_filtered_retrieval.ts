import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_customer_shipment_list_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category for product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup - create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: { categoryId: category.id },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 3. Customer setup - authenticate and add variant to cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { productVariantId: variant.id },
      },
    );
  typia.assert(cartItem);
  // 4. Call PATCH /ecommerceMall/customer/shipments with filters
  // Test basic retrieval with minimal filters
  const basicRequest: IEcommerceMallShipment.IRequest = {
    orderId: null,
    sellerId: null,
    carrierName: null,
    status: null,
    shippedAtFrom: null,
    shippedAtTo: null,
    page: 1,
    limit: 20,
    search: null,
    sort: null,
    order: null,
  };
  const basicResponse: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      { body: basicRequest },
    );
  typia.assert(basicResponse);
  // 5. Verify shipments belong only to the authenticated customer
  // This is business logic validation, not type checking (allowed after typia.assert)
  for (const shipment of basicResponse.data) {
    TestValidator.equals(
      "shipment order customer ID matches authenticated customer",
      (shipment.order.customer as IEntity).id,
      customer.id,
    );
  }
  // 6. Test with status filter (both statuses)
  for (const status of ["in_transit", "delivered"] as const) {
    const statusRequest: IEcommerceMallShipment.IRequest = {
      ...basicRequest,
      status,
    };
    const statusResponse: IPageIEcommerceMallShipment.ISummary =
      await api.functional.ecommerceMall.customer.shipments.index(
        customerConnection,
        { body: statusRequest },
      );
    typia.assert(statusResponse);
  }
  // 7. Test with date range filter
  const dateRangeRequest: IEcommerceMallShipment.IRequest = {
    ...basicRequest,
    shippedAtFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    shippedAtTo: new Date().toISOString(),
  };
  const dateRangeResponse: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResponse);
  // 8. Test with pagination parameters
  const pageRequest: IEcommerceMallShipment.IRequest = {
    ...basicRequest,
    page: 1,
    limit: 10,
  };
  const pageResponse: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      { body: pageRequest },
    );
  typia.assert(pageResponse);
  TestValidator.equals(
    "pagination limit matches request",
    pageResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page matches request",
    pageResponse.pagination.current,
    1,
  );
}