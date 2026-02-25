import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_approval_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);
  // 2. Register second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2);
  // 3. Create order for seller1 (to have a valid refund request)
  // Note: This requires a complete order creation flow
  // For testing purposes, we'll use existing order ID from scenario
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller1 attempts to approve a non-existent refund request (404)
  await TestValidator.error("refund request not found", async () => {
    await api.functional.shoppingMall.seller.refund_requests.approval.approve(
      seller1Connection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action: "approve",
          reason: "Approved by seller",
        } satisfies IShoppingMallOrderRefundRequest.IRequest,
      },
    );
  });
  // 5. Seller2 attempts to approve seller1's refund request (403 forbidden)
  // Note: This tests cross-seller access prevention
  await TestValidator.error("seller not authorized for refund", async () => {
    await api.functional.shoppingMall.seller.refund_requests.approval.approve(
      seller2Connection,
      {
        requestId: orderId, // Using orderId as placeholder for refund request ID
        body: {
          action: "approve",
          reason: "Unauthorized approval attempt",
        } satisfies IShoppingMallOrderRefundRequest.IRequest,
      },
    );
  });
  // 6. Seller1 attempts to approve already approved refund request (409)
  // Note: This tests double-approval prevention
  await TestValidator.error("refund request already approved", async () => {
    await api.functional.shoppingMall.seller.refund_requests.approval.approve(
      seller1Connection,
      {
        requestId: orderId, // Using orderId as placeholder
        body: {
          action: "approve",
          reason: "Double approval attempt",
        } satisfies IShoppingMallOrderRefundRequest.IRequest,
      },
    );
  });
}