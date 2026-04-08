import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_order_items_cancellation_requests_create } from "../../../generate/generate_random_mall_platform_administrator_order_items_cancellation_requests_create";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

export async function test_api_cancellation_request_retrieve_by_item_scope(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator-scoped retrieval of a cancellation request bound to a specific order item.
   *
   * This test exercises the read endpoint for cancellation requests using a real administrator session and a request created through the cancellation workflow. It verifies that the record can be fetched only through the matching order-item scope and that the response preserves the request's reason, status, reviewer information, review outcome, and lifecycle timestamps.
   *
   * 1. Register and authenticate an administrator using an isolated connection.
   * 2. Create a cancellation request for a specific order item using the scoped write endpoint.
   * 3. Retrieve the cancellation request through the scoped read endpoint.
   * 4. Validate that the fetched response matches the created request and preserves all business fields.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const requestReason = RandomGenerator.paragraph({ sentences: 2 });
  const created: IMallPlatformCancellationRequest =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.create(
      administratorConnection,
      {
        orderItemId,
        body: {
          reason: requestReason,
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(created);
  const retrieved: IMallPlatformCancellationRequest =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.at(
      administratorConnection,
      {
        orderItemId,
        cancellationRequestId: created.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("cancellation request id", retrieved.id, created.id);
  TestValidator.equals(
    "linked order item id",
    retrieved.orderItem.id,
    created.orderItem.id,
  );
  TestValidator.equals("request reason", retrieved.reason, created.reason);
  TestValidator.equals("request status", retrieved.status, created.status);
  TestValidator.equals("reviewer", retrieved.reviewer, created.reviewer);
  TestValidator.equals("reviewed at", retrieved.reviewedAt, created.reviewedAt);
  TestValidator.equals(
    "review result",
    retrieved.reviewResult,
    created.reviewResult,
  );
  TestValidator.equals(
    "reviewer note",
    retrieved.reviewerNote,
    created.reviewerNote,
  );
  TestValidator.equals(
    "created timestamp",
    retrieved.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "updated timestamp",
    retrieved.updatedAt,
    created.updatedAt,
  );
  TestValidator.equals(
    "deleted timestamp",
    retrieved.deletedAt,
    created.deletedAt,
  );
  TestValidator.equals(
    "order item quantity preserved",
    retrieved.orderItem.quantity,
    created.orderItem.quantity,
  );
  TestValidator.equals(
    "order item status preserved",
    retrieved.orderItem.status,
    created.orderItem.status,
  );
  TestValidator.equals(
    "order item order id preserved",
    retrieved.orderItem.order.id,
    created.orderItem.order.id,
  );
  TestValidator.equals(
    "order item seller id preserved",
    retrieved.orderItem.seller.id,
    created.orderItem.seller.id,
  );
  TestValidator.equals(
    "order item variant id preserved",
    retrieved.orderItem.productVariant.id,
    created.orderItem.productVariant.id,
  );
}
