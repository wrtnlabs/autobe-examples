import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
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

export async function test_api_refund_request_admin_update_ineligible_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates administrator refund-request updates are rejected for an ineligible item scope.
   *
   * This test exercises the administrator-only refund-request update endpoint with a route
   * that cannot represent a valid refund-eligible workflow. It verifies that the operation is
   * rejected and does not proceed with a live update.
   *
   * 1. Attempt to update a refund request for a non-eligible order-item scope.
   * 2. Verify the endpoint rejects the request.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    status: "approved",
    reviewed_at: new Date().toISOString(),
    review_note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformRefundRequest.IUpdate;
  await TestValidator.error(
    "administrator refund request update should be rejected for ineligible item",
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.refundRequests.update(
        administratorConnection,
        {
          orderItemId,
          refundRequestId,
          body,
        },
      );
    },
  );
}
