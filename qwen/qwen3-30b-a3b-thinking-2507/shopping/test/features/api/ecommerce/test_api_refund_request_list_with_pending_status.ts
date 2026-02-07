import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_list_with_pending_status(
  connection: api.IConnection,
) {
  // Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  // Get refund requests
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const refundRequests: IPageIEcommerceRefundRequest.ISummary =
    await api.functional.ecommerce.admin.orders.refund_requests.index(
      adminConnection,
      {
        orderId,
        body: { status: "pending" } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequests);
  // Verify
  TestValidator.predicate(
    "should have at least one refund request",
    () => refundRequests.data.length > 0,
  );
  TestValidator.predicate("all refund requests have status 'pending'", () => {
    return refundRequests.data.every((request) => request.status === "pending");
  });
  // Verify refund request details
  const firstRefund = refundRequests.data[0];
  TestValidator.predicate(
    "should have reason provided",
    () => firstRefund.reason.length > 0,
  );
  TestValidator.predicate(
    "should have created timestamp",
    () => firstRefund.created_at.length > 0,
  );
}
