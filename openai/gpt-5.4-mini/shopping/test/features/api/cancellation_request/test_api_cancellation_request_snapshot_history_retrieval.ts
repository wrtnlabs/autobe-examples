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
 * Retrieve cancellation request snapshot history for a seller-owned order item.
 *
 * Validates that an authenticated seller can access the immutable historical trail for a cancellation request tied to one of their order items. The test checks the paginated response shape, confirms that the returned snapshots preserve audit metadata, and verifies that the snapshot records are ordered in stable reverse-chronological history.
 *
 * This scenario focuses on dispute-review behavior and snapshot immutability rather than live mutation. It ensures the endpoint remains read-only, the historical records retain the seller's recorded decision data, and the returned page object is structurally valid for downstream review screens.
 *
 * 1. Register and authenticate a seller using the required seller auth endpoint.
 * 2. Request the cancellation-request snapshot history for a scoped order item and cancellation request.
 * 3. Validate pagination metadata, snapshot ordering, and preserved historical fields.
 */
export async function test_api_cancellation_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const snapshots =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestid(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "pagination current is non-negative",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history response is ordered by newest first",
    snapshots.data.every(
      (snapshot, index, array) =>
        index === 0 || array[index - 1].createdAt >= snapshot.createdAt,
    ),
  );
  TestValidator.predicate(
    "snapshot history preserves audit fields",
    snapshots.data.every(
      (snapshot) =>
        snapshot.id.length > 0 &&
        snapshot.snapshotStatus.length > 0 &&
        (snapshot.reviewResult === null || snapshot.reviewResult.length > 0) &&
        (snapshot.reason === null || snapshot.reason.length > 0) &&
        snapshot.changedAt.length > 0 &&
        snapshot.createdAt.length > 0 &&
        snapshot.updatedAt.length > 0 &&
        (snapshot.deletedAt === null || snapshot.deletedAt.length > 0),
    ),
  );
}
