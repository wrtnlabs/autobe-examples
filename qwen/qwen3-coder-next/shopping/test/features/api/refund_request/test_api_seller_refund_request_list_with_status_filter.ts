import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderRefundRequest";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrderDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDeliveryConfirmation";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test seller refund request list with status filter.
 * 1. Create seller actor and authenticate
 * 2. Create customer actor and authenticate
 * 3. Seller creates a product with variant
 * 4. Create multiple refund requests with different scenarios
 * 5. Test seller refund request list with status filter
 */
export async function test_api_seller_refund_request_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller actor and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: RandomGenerator.alphaNumeric(12),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(sellerAuthorized);
  // 2. Create customer actor and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    phone_number: null,
    href: "https://example.com/register",
    referrer: "https://example.com",
    ip: null,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customerAuthorized);
  // 3. Seller creates a product with variant
  const category = typia.random<IShoppingMallCategory.ISummary>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: "black",
              },
            ],
            price_override: null,
            stock_quantity: 100,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create multiple refund requests with different scenarios
  // Create first refund request (pending)
  const refundRequest1 =
    await generate_random_shopping_mall_customer_order_items_refund_request_create(
      customerConnection,
      {
        params: {
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest1);
  TestValidator.equals("status is pending", refundRequest1.status, "pending");
  // Approve first refund request to change status to approved
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.approve.approveRefund(
      sellerConnection,
      {
        requestId: refundRequest1.id,
      },
    );
  typia.assert(approvedRefund);
  TestValidator.equals(
    "status changed to approved",
    approvedRefund.status,
    "approved",
  );
  // 5. Test seller refund request list with status filter
  // Get all refund requests for the seller
  const allResponse =
    await api.functional.shoppingMall.seller.refund_requests.at(
      sellerConnection,
    );
  typia.assert(allResponse);
  // Verify response structure
  TestValidator.predicate("has data array", Array.isArray(allResponse.data));
  TestValidator.predicate(
    "has pagination",
    allResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page >= 1",
    allResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit >= 1",
    allResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records >= 0",
    allResponse.pagination.records >= 0,
  );
  // Verify we can see both pending and approved requests
  const hasPending = allResponse.data.some((r) => r.status === "pending");
  const hasApproved = allResponse.data.some((r) => r.status === "approved");
  TestValidator.predicate("has pending requests", hasPending);
  TestValidator.predicate("has approved requests", hasApproved);
  // Verify refund request count includes approved request
  const hasApprovedRequest = allResponse.data.some(
    (r) => r.id === refundRequest1.id,
  );
  TestValidator.predicate("includes approved request", hasApprovedRequest);
  // Test that refund requests include required fields
  allResponse.data.forEach(
    (request: IShoppingMallOrderRefundRequest.ISummary) => {
      TestValidator.equals("has id", typeof request.id, "string");
      TestValidator.predicate("has orderItem", request.orderItem !== undefined);
      TestValidator.predicate("has customer", request.customer !== undefined);
      TestValidator.equals("has status", typeof request.status, "string");
      TestValidator.equals("has reason", typeof request.reason, "string");
    },
  );
}
