import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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
import { generate_random_mall_platform_customer_order_items_refund_requests_create } from "../../../generate/generate_random_mall_platform_customer_order_items_refund_requests_create";
import { prepare_random_mall_platform_refund_request } from "../../../prepare/prepare_random_mall_platform_refund_request";

export async function test_api_refund_request_update_preserves_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/checkout",
      referrer: "https://example.com/catalog",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const refundRequest =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: {
          orderItemId,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMallPlatformRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  const updatedAt = new Date().toISOString();
  const updateBody = {
    status: "approved",
    reviewed_at: updatedAt,
    review_note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformRefundRequest.IUpdate;
  const updated =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.update(
      sellerConnection,
      {
        orderItemId,
        refundRequestId: refundRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "refund request id preserved",
    updated.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request order item preserved",
    updated.orderItem.id,
    refundRequest.orderItem.id,
  );
  TestValidator.equals(
    "refund request customer preserved",
    updated.customer.id,
    refundRequest.customer.id,
  );
  TestValidator.equals(
    "refund request seller preserved",
    updated.seller.id,
    refundRequest.seller.id,
  );
  TestValidator.equals(
    "refund request status updated",
    updated.status,
    updateBody.status,
  );
  TestValidator.equals(
    "refund request reviewedAt updated",
    updated.reviewedAt,
    updateBody.reviewed_at,
  );
  TestValidator.equals(
    "refund request review note updated",
    updated.reviewNote,
    updateBody.review_note,
  );
  TestValidator.equals(
    "refund request reason preserved",
    updated.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "refund request order context preserved",
    updated.orderItem.order.id,
    refundRequest.orderItem.order.id,
  );
  TestValidator.equals(
    "refund request product variant preserved",
    updated.orderItem.productVariant.id,
    refundRequest.orderItem.productVariant.id,
  );
}
