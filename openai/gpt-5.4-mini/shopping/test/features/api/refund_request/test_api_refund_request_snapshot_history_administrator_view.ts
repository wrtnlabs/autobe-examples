import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_history_administrator_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator access to refund request snapshot history.
   *
   * Verifies that the refund-request snapshot history endpoint is reachable by
   * an authenticated administrator, returns a paginated collection, and
   * preserves immutable snapshot rows in newest-first order by default.
   *
   * The test focuses on response shape and audit-history guarantees because the
   * available SDK surface does not expose dedicated setup endpoints for refund
   * requests or their snapshot mutations. It still exercises the protected
   * administrator-only path and validates the snapshot list contract used for
   * dispute review.
   *
   * 1. Authenticate as an administrator through the join utility.
   * 2. Request refund snapshot history for a scoped order item / refund request pair.
   * 3. Validate pagination metadata and immutable snapshot fields.
   * 4. Confirm the returned rows are ordered newest-first by default.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(12)}@test.com` satisfies string &
          typia.tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(12) satisfies string &
          typia.tags.Format<"password">,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const output =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.snapshots.index(
      administratorConnection,
      {
        orderItemId: typia.random<string & typia.tags.Format<"uuid">>(),
        refundRequestId: typia.random<string & typia.tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page should match request",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  const ordered = [...output.data].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
  TestValidator.equals(
    "refund request snapshots should be ordered newest-first by default",
    output.data.map((row) => row.id),
    ordered.map((row) => row.id),
  );
  for (const snapshot of output.data) {
    TestValidator.predicate(
      "snapshot reason should be preserved",
      snapshot.snapshot_reason.length > 0,
    );
    TestValidator.predicate(
      "snapshot before status should be preserved",
      snapshot.status_before.length > 0,
    );
    TestValidator.predicate(
      "snapshot after status should be preserved",
      snapshot.status_after.length > 0,
    );
    TestValidator.predicate(
      "snapshot created timestamp should be preserved",
      snapshot.created_at.length > 0,
    );
  }
}
