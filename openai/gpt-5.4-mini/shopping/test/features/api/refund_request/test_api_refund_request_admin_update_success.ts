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

export async function test_api_refund_request_admin_update_success(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reviewedAt = new Date().toISOString();
  const reviewNote = RandomGenerator.paragraph({ sentences: 2 });
  const body = {
    reviewed_at: reviewedAt,
    review_note: reviewNote,
    status: "reviewed",
  } satisfies IMallPlatformRefundRequest.IUpdate;
  const updated =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.update(
      administratorConnection,
      {
        orderItemId,
        refundRequestId,
        body,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "refund request id should remain the same",
    updated.id,
    refundRequestId,
  );
  TestValidator.equals(
    "order item id should remain unchanged",
    updated.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "refund request status should reflect the submitted update",
    updated.status,
    body.status,
  );
  TestValidator.equals(
    "refund request reviewedAt should reflect the submitted update",
    updated.reviewedAt,
    reviewedAt,
  );
  TestValidator.equals(
    "refund request review note should reflect the submitted update",
    updated.reviewNote,
    reviewNote,
  );
}
