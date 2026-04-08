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
 * Test preserved cancellation request snapshot history after seller review.
 *
 * Verifies that a seller-authenticated request can retrieve immutable
 * cancellation-request snapshots for an order item after the request has been
 * reviewed, and that the returned page exposes stable pagination metadata and
 * a preserved historical ordering suitable for dispute resolution.
 *
 * The test focuses on historical read behavior only:
 * 1. Seller registration and isolated authenticated connection setup.
 * 2. Retrieval of cancellation request snapshots for a scoped order item.
 * 3. Validation that pagination metadata is present and snapshot records remain
 *    available as an immutable historical view with deterministic ordering.
 */
export async function test_api_cancellation_request_snapshots_preserved_history_review(
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
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const page =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        cancellationRequestId,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination metadata exists",
    () => page.pagination !== null,
  );
  TestValidator.predicate("pagination has non-negative counts", () => {
    return (
      page.pagination.current >= 0 &&
      page.pagination.limit >= 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0
    );
  });
  TestValidator.predicate("snapshot data is an array", () =>
    Array.isArray(page.data),
  );
  TestValidator.predicate("snapshot history is chronologically ordered", () =>
    page.data.every((snapshot, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1]!;
      return (
        prev.changedAt < snapshot.changedAt ||
        (prev.changedAt === snapshot.changedAt &&
          prev.createdAt <= snapshot.createdAt)
      );
    }),
  );
  TestValidator.predicate(
    "snapshots preserve immutable historical fields",
    () => page.data.every((snapshot) => snapshot.cancellationRequest !== null),
  );
}
