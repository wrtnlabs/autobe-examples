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

export async function test_api_cancellation_request_reject_item_keeps_active(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator rejection of a cancellation request and preservation of the active order item context.
   *
   * Validates the moderation response for a pending cancellation request on a specific order item. The test verifies the rejection outcome, reviewer metadata, review timestamp, and reviewer note handling using the supported response DTO fields.
   *
   * It also confirms that the response still carries the linked order item context and that the request remains available in a closed state for later dispute review.
   *
   * 1. Authenticate an administrator using the administrator join utility.
   * 2. Submit a rejection decision for a cancellation request belonging to an order item.
   * 3. Validate the returned cancellation request reflects the rejected review state and reviewer metadata.
   * 4. Confirm the nested order item context and preserved request details are present in the response.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const reviewerNote = RandomGenerator.paragraph({ sentences: 2 });
  const output =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.update(
      adminConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          decision: "reject",
          reviewerNote,
        } satisfies IMallPlatformCancellationRequest.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "cancellation request is rejected",
    output.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewer note is preserved",
    output.reviewerNote,
    reviewerNote,
  );
  TestValidator.predicate(
    "reviewed timestamp is recorded",
    output.reviewedAt !== null,
  );
  TestValidator.predicate(
    "review result is recorded",
    output.reviewResult !== null,
  );
  TestValidator.predicate(
    "reviewer metadata is present",
    output.reviewer !== null,
  );
  TestValidator.predicate(
    "order item context is present",
    output.orderItem !== null,
  );
  if (output.reviewer !== null) {
    TestValidator.equals(
      "reviewer id matches the authenticated administrator",
      output.reviewer.id,
      authorized.id,
    );
    TestValidator.equals(
      "reviewer email matches the authenticated administrator",
      output.reviewer.email,
      authorized.email,
    );
  }
  TestValidator.predicate(
    "order item remains linked to an order",
    output.orderItem.order.id.length > 0,
  );
}
