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
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
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

export async function test_api_refund_request_snapshot_chain_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator refund request snapshot lookup rejects mismatched ownership chains.
   *
   * Validates that the refund-request snapshot detail endpoint enforces the full
   * order-item → refund-request → snapshot ownership chain. The test authenticates
   * as an administrator, then issues nested snapshot requests with structurally
   * valid UUID path parameters arranged in mismatched combinations so the server
   * must reject unrelated historical data instead of exposing another refund
   * workflow's snapshot details.
   *
   * 1. Register an administrator account through the administrator join utility.
   * 2. Build multiple mismatched UUID combinations for the order item, refund request, and snapshot.
   * 3. Call the snapshot lookup endpoint through the administrator connection.
   * 4. Assert each invalid chain combination fails with a not-found HTTP error.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const chainCases = [
    {
      orderItemId: typia.random<string & tags.Format<"uuid">>(),
      refundRequestId: typia.random<string & tags.Format<"uuid">>(),
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    },
    {
      orderItemId: typia.random<string & tags.Format<"uuid">>(),
      refundRequestId: typia.random<string & tags.Format<"uuid">>(),
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    },
  ] as const;
  await ArrayUtil.asyncForEach(chainCases, async (chain) => {
    await TestValidator.httpError(
      "mismatched refund request snapshot chain should not be found",
      404,
      async () => {
        await api.functional.mallPlatform.administrator.orderItems.refundRequests.snapshots.at(
          administratorConnection,
          chain,
        );
      },
    );
  });
}
