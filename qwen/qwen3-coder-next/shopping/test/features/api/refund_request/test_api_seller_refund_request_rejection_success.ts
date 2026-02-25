import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";

/**
 * Test successful rejection of refund request:
 * 1. Seller registers and gets approved
 * 2. Customer registers and logs in
 * 3. Customer creates an order with delivered item
 * 4. Customer requests refund for delivered item
 * 5. Seller rejects the refund request
 * 6. Validate refund request status is "rejected" with rejection reason
 */
export async function test_api_seller_refund_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and login
  const sellerEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerUser = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "12345678",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerUser);
  // Login as seller to perform seller operations
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: "12345678",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create customer account and login
  const customerEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerUser = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerUser);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Create a mock order item with delivered status for refund testing
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Customer creates refund request for the order item
  const refundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_request.create(
      customerLoginConnection,
      {
        itemId: orderItemId,
        body: {
          reason: "Not as described",
        } satisfies IShoppingMallOrderRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 5. Seller rejects the refund request
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.rejection.reject(
      sellerLoginConnection,
      {
        requestId: refundRequest.id,
        body: {
          rejection_reason:
            "Product is in good condition and matches description",
        } satisfies IShoppingMallOrderRefundRequest.IRejection,
      },
    );
  typia.assert(rejectedRefundRequest);
  // 6. Validate rejection
  TestValidator.equals(
    "refund request status is rejected",
    rejectedRefundRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedRefundRequest.rejectionReason,
    "Product is in good condition and matches description",
  );
}
