import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test filtering by 'pending' status
  const pendingResult =
    await api.functional.shoppingMall.administrator.seller.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Validate all pending requests have correct properties
  for (const request of pendingResult.data) {
    TestValidator.equals("pending status", request.status, "pending");
    TestValidator.equals(
      "respondedAt is null for pending",
      request.respondedAt,
      null,
    );
  }
  // 3. Test filtering by 'approved' status
  const approvedResult =
    await api.functional.shoppingMall.administrator.seller.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Validate all approved requests have correct properties
  for (const request of approvedResult.data) {
    TestValidator.equals("approved status", request.status, "approved");
    TestValidator.predicate(
      "respondedAt is populated for approved",
      request.respondedAt !== null,
    );
  }
  // 4. Test filtering by 'rejected' status
  const rejectedResult =
    await api.functional.shoppingMall.administrator.seller.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Validate all rejected requests have correct properties
  for (const request of rejectedResult.data) {
    TestValidator.equals("rejected status", request.status, "rejected");
    TestValidator.predicate(
      "respondedAt is populated for rejected",
      request.respondedAt !== null,
    );
  }
}
