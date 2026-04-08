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

export async function test_api_refund_request_update_affects_only_target_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const firstOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const secondOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const firstRequest =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId: firstOrderItemId },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(firstRequest);
  const secondRequest =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId: secondOrderItemId },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(secondRequest);
  const secondRequestSnapshot = {
    id: secondRequest.id,
    reason: secondRequest.reason,
    status: secondRequest.status,
    reviewedAt: secondRequest.reviewedAt,
    reviewNote: secondRequest.reviewNote,
    updatedAt: secondRequest.updatedAt,
    orderItemId: secondRequest.orderItem.id,
  };
  const updatedFirstRequest =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.update(
      sellerConnection,
      {
        orderItemId: firstOrderItemId,
        refundRequestId: firstRequest.id,
        body: {
          reason: `${firstRequest.reason} updated`,
          status: firstRequest.status,
          reviewed_at: firstRequest.reviewedAt,
          review_note: "Updated for targeted item only",
        } satisfies IMallPlatformRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedFirstRequest);
  TestValidator.equals(
    "updated request keeps its identifier",
    updatedFirstRequest.id,
    firstRequest.id,
  );
  TestValidator.equals(
    "updated request stays scoped to the first order item",
    updatedFirstRequest.orderItem.id,
    firstOrderItemId,
  );
  TestValidator.equals(
    "updated request reason changes",
    updatedFirstRequest.reason,
    `${firstRequest.reason} updated`,
  );
  TestValidator.equals(
    "updated request status stays the same when only review note changes",
    updatedFirstRequest.status,
    firstRequest.status,
  );
  TestValidator.equals(
    "updated request review note changes",
    updatedFirstRequest.reviewNote,
    "Updated for targeted item only",
  );
  TestValidator.equals(
    "second request id remains unchanged",
    secondRequest.id,
    secondRequestSnapshot.id,
  );
  TestValidator.equals(
    "second request reason remains unchanged",
    secondRequest.reason,
    secondRequestSnapshot.reason,
  );
  TestValidator.equals(
    "second request status remains unchanged",
    secondRequest.status,
    secondRequestSnapshot.status,
  );
  TestValidator.equals(
    "second request reviewedAt remains unchanged",
    secondRequest.reviewedAt,
    secondRequestSnapshot.reviewedAt,
  );
  TestValidator.equals(
    "second request review note remains unchanged",
    secondRequest.reviewNote,
    secondRequestSnapshot.reviewNote,
  );
  TestValidator.equals(
    "second request updatedAt remains unchanged",
    secondRequest.updatedAt,
    secondRequestSnapshot.updatedAt,
  );
  TestValidator.equals(
    "second request order item remains unchanged",
    secondRequest.orderItem.id,
    secondRequestSnapshot.orderItemId,
  );
}
