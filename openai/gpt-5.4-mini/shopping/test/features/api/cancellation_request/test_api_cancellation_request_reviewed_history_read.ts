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
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_reviewed_history_read(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a seller can reread a reviewed cancellation request and observe stable history fields.
   *
   * This test authenticates a seller, reads the same cancellation request twice through the seller-scoped endpoint,
   * and confirms the returned payload is stable for dispute review. It focuses on the live cancellation request record
   * and validates that the preserved review metadata, order-item context, and timestamps do not change across reads.
   *
   * 1. Register a seller account and create an isolated seller connection.
   * 2. Read the cancellation request from the seller order-item scope.
   * 3. Read the same request again using the returned identifiers.
   * 4. Verify the response is stable and the reviewed-history fields remain preserved.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const first =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.at(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.at(
      sellerConnection,
      {
        orderItemId: first.orderItem.id,
        cancellationRequestId: first.id,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "cancellation request id should remain stable",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "order item should remain stable",
    second.orderItem,
    first.orderItem,
  );
  TestValidator.equals(
    "cancellation reason should remain stable",
    second.reason,
    first.reason,
  );
  TestValidator.equals(
    "request status should remain stable",
    second.status,
    first.status,
  );
  TestValidator.equals(
    "reviewed at should remain stable",
    second.reviewedAt,
    first.reviewedAt,
  );
  TestValidator.equals(
    "review result should remain stable",
    second.reviewResult,
    first.reviewResult,
  );
  TestValidator.equals(
    "reviewer note should remain stable",
    second.reviewerNote,
    first.reviewerNote,
  );
  TestValidator.equals(
    "reviewer should remain stable",
    second.reviewer,
    first.reviewer,
  );
  TestValidator.equals(
    "createdAt should remain stable",
    second.createdAt,
    first.createdAt,
  );
  TestValidator.equals(
    "updatedAt should remain stable",
    second.updatedAt,
    first.updatedAt,
  );
  TestValidator.equals(
    "deletedAt should remain stable",
    second.deletedAt,
    first.deletedAt,
  );
  TestValidator.predicate(
    "reviewed cancellation request should include an order item context",
    second.orderItem.id.length > 0 && second.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "reviewed cancellation request should preserve reviewed history fields",
    second.reviewedAt !== null && second.reviewResult !== null,
  );
  TestValidator.predicate(
    "reviewed cancellation request should preserve a reviewer record",
    second.reviewer !== null,
  );
}
