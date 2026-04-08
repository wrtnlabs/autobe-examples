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
 * Test seller access to immutable cancellation request snapshot history retrieval.
 *
 * This test validates that an authenticated seller can retrieve the paginated snapshot history for a cancellation request scoped to a specific order item.
 * It checks that the response contains preserved historical records suitable for audit and dispute review, and that the collection exposes the expected snapshot metadata without mutating any live cancellation-request data.
 *
 * 1. Register a seller through the seller join utility to obtain an authenticated session.
 * 2. Request the cancellation-request snapshot history for a random order item and cancellation request identifier pair.
 * 3. Validate the response as a paginated page of immutable cancellation-request snapshots.
 * 4. Confirm each snapshot preserves historical fields such as snapshot status, reviewer outcome, reason, and timestamps.
 */
export async function test_api_cancellation_request_snapshots_history_retrieval(
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
  const output =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is non-negative",
    () => output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    () => output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    () => output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    () => output.pagination.pages >= 0,
  );
  TestValidator.predicate("snapshot list is an array", () =>
    Array.isArray(output.data),
  );
  for (const snapshot of output.data) {
    TestValidator.predicate("snapshot id exists", () => snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot status exists",
      () => snapshot.snapshotStatus.length > 0,
    );
    TestValidator.predicate(
      "snapshot changedAt exists",
      () => snapshot.changedAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot createdAt exists",
      () => snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot updatedAt exists",
      () => snapshot.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot cancellation request relation exists",
      () => snapshot.cancellationRequest !== null,
    );
    TestValidator.predicate(
      "snapshot review result is preserved as nullable data",
      () => snapshot.reviewResult === null || snapshot.reviewResult.length > 0,
    );
    TestValidator.predicate(
      "snapshot reason is preserved as nullable data",
      () => snapshot.reason === null || snapshot.reason.length > 0,
    );
  }
}
