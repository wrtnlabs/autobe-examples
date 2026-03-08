import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_requests_dashboard_access_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller accounts - all new sellers start with pending approval
  const sellerAccounts = ArrayUtil.repeat(3, () => {
    const accountConnection: api.IConnection = { host: connection.host };
    return authorize_seller_join(accountConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
  const sellerA = await sellerAccounts[0];
  const sellerB = await sellerAccounts[1];
  const sellerC = await sellerAccounts[2];
  typia.assert(sellerA);
  typia.assert(sellerB);
  typia.assert(sellerC);
  // 2. Create seller-specific connections for each account
  const sellerAConnection: api.IConnection = { host: connection.host };
  sellerAConnection.headers = { Authorization: sellerA.token.access };
  const sellerBConnection: api.IConnection = { host: connection.host };
  sellerBConnection.headers = { Authorization: sellerB.token.access };
  const sellerCConnection: api.IConnection = { host: connection.host };
  sellerCConnection.headers = { Authorization: sellerC.token.access };
  // 3. Verify new sellers have pending status
  TestValidator.equals(
    "sellerA approval status is pending",
    sellerA.approval_status,
    "pending",
  );
  TestValidator.equals(
    "sellerB approval status is pending",
    sellerB.approval_status,
    "pending",
  );
  TestValidator.equals(
    "sellerC approval status is pending",
    sellerC.approval_status,
    "pending",
  );
  // 4. Test pending seller (Seller A) cannot access dashboard
  await TestValidator.error("pending seller denied access", async () => {
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  });
  // 5. Test another pending seller (Seller B) cannot access dashboard
  await TestValidator.error(
    "another pending seller denied access",
    async () => {
      await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
        sellerBConnection,
        {
          body: {} satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    },
  );
  // 6. Test unauthorized request (no token) returns 401
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized request returns 401",
    401,
    async () => {
      await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
        unauthorizedConnection,
        {
          body: {} satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    },
  );
  // 7. Test invalid token returns 401
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  invalidTokenConnection.headers = { Authorization: "invalid-token" };
  await TestValidator.httpError("invalid token returns 401", 401, async () => {
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      invalidTokenConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  });
  // 8. Test expired token returns 401
  const expiredTokenConnection: api.IConnection = { host: connection.host };
  expiredTokenConnection.headers = {
    Authorization:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  };
  await TestValidator.httpError("expired token returns 401", 401, async () => {
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      expiredTokenConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  });
}
