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

export async function test_api_order_item_cancellation_request_create_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator order-item cancellation request creation success.
   *
   * Validates that an authenticated administrator can submit a cancellation
   * request for a specific order item and receive a pending cancellation request
   * response. The test checks that the request is bound to the target order item,
   * preserves the submitted reason, exposes an unreviewed reviewer state, and
   * returns the expected nested order-item summary fields.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Create a valid cancellation request payload with a meaningful reason.
   * 3. Submit the cancellation request for a generated order item id.
   * 4. Validate the returned cancellation request fields and nested summaries.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const output =
    await generate_random_mall_platform_administrator_order_items_cancellation_requests_create(
      adminConnection,
      {
        params: { orderItemId },
        body: { reason } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "linked order item id",
    output.orderItem.id,
    orderItemId,
  );
  TestValidator.equals("stored cancellation reason", output.reason, reason);
  TestValidator.equals("initial status", output.status, "pending");
  TestValidator.equals("reviewer should be null", output.reviewer, null);
  TestValidator.equals("reviewedAt should be null", output.reviewedAt, null);
  TestValidator.equals(
    "reviewResult should be null",
    output.reviewResult,
    null,
  );
  TestValidator.equals(
    "reviewerNote should be null",
    output.reviewerNote,
    null,
  );
  TestValidator.predicate(
    "order item summary has an identifier",
    output.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "order summary is present",
    output.orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "product variant summary is present",
    output.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "seller summary is present",
    output.orderItem.seller.id.length > 0,
  );
}
