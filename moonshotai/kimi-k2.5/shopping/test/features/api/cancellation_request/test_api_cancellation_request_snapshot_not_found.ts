import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the edge case where a seller attempts to query snapshots for a non-existent cancellation request.
 *
 * 1. Authenticate as seller using the utility function to establish authorized session
 * 2. Generate a random UUID that doesn't exist in the system to simulate non-existent resource
 * 3. Attempt to query snapshots using the non-existent cancellation request ID
 * 4. Verify the system returns 404 Not Found error as specified in the operation specification
 */
export async function test_api_cancellation_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to query snapshots and verify 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent cancellation request",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.cancellationRequests.snapshots.index(
        sellerConnection,
        {
          cancellationRequestId: nonExistentCancellationRequestId,
          body: {} satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
        },
      );
    },
  );
}
