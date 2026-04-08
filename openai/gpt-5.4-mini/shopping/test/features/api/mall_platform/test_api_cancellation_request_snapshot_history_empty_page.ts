import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies empty cancellation request snapshot history pagination for a seller-owned request.
 *
 * This test validates that browsing immutable cancellation request snapshots returns a normal empty page when the target cancellation request exists but has not accumulated any snapshots yet. It focuses on the paginated contract, ensuring the response includes pagination metadata and an empty data array rather than an error.
 *
 * 1. Register a seller account and prepare an authenticated seller connection.
 * 2. Call the cancellation request snapshot history endpoint with valid UUID route parameters and an empty-page request.
 * 3. Validate that the response contains zero records and an empty snapshot list.
 */
export async function test_api_cancellation_request_snapshot_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const response =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "empty snapshot current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("empty snapshot limit", response.pagination.limit, 10);
  TestValidator.equals(
    "empty snapshot records",
    response.pagination.records,
    0,
  );
  TestValidator.equals("empty snapshot pages", response.pagination.pages, 0);
  TestValidator.equals("empty snapshot data", response.data.length, 0);
}
