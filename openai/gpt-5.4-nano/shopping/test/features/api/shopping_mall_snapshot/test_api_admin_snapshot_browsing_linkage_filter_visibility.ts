import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_snapshot_browsing_linkage_filter_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<IShoppingMallAdmin.IJoin["email"]>();
  const password = typia.random<IShoppingMallAdmin.IJoin["password"]>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(admin);
  // 2) Initial broad browsing to discover real snapshot linkage ids
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const to = now.toISOString();
  const broadLimit = 10;
  const broad = await api.functional.shoppingMall.admin.snapshots.index(
    adminConnection,
    {
      body: {
        createdAtFrom: from,
        createdAtTo: to,
        page: 1,
        limit: broadLimit,
      } satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(broad);
  const first = broad.data[0];
  const sourceType = first?.source_type;
  // If no data in current window, just ensure pagination metadata is valid for a request with only page/limit.
  if (sourceType === undefined) {
    TestValidator.equals("broad current page", broad.pagination.current, 1);
    TestValidator.equals("broad limit", broad.pagination.limit, broadLimit);
    TestValidator.predicate(
      "broad pages non-negative",
      broad.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "broad records non-negative",
      broad.pagination.records >= 0,
    );
    TestValidator.equals(
      "broad data length not exceed limit",
      broad.data.length <= broad.pagination.limit,
      true,
    );
    return;
  }
  const candidateOrderItemId = first.source_order_item_id;
  const candidateOrderId = first.source_order_id;
  const candidateReviewId = first.source_review_id;
  const candidateCancellationId = first.source_cancellation_request_id;
  const candidateRefundId = first.source_refund_request_id;
  const body: IShoppingMallSnapshot.IRequest = {
    sourceType,
    createdAtFrom: from,
    createdAtTo: to,
    page: 1,
    limit: 5,
  };
  // 3) Apply one linkage filter if available (prefer order_item)
  if (candidateOrderItemId !== null) {
    body.sourceOrderItemId = candidateOrderItemId;
  } else if (candidateOrderId !== null) {
    body.sourceOrderId = candidateOrderId;
  } else if (candidateReviewId !== null) {
    body.sourceReviewId = candidateReviewId;
  } else if (candidateCancellationId !== null) {
    body.sourceCancellationRequestId = candidateCancellationId;
  } else if (candidateRefundId !== null) {
    body.sourceRefundRequestId = candidateRefundId;
  }
  const filteredLimit = body.limit as number;
  const filtered = await api.functional.shoppingMall.admin.snapshots.index(
    adminConnection,
    {
      body: body satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(filtered);
  // 4) Validate results
  TestValidator.equals("filtered current page", filtered.pagination.current, 1);
  TestValidator.equals(
    "filtered limit",
    filtered.pagination.limit,
    filteredLimit,
  );
  TestValidator.equals(
    "filtered data length not exceed limit",
    filtered.data.length <= filtered.pagination.limit,
    true,
  );
  if (filtered.pagination.records === 0) {
    TestValidator.equals(
      "filtered pages zero when no records",
      filtered.pagination.pages,
      0,
    );
  } else {
    TestValidator.equals(
      "filtered pages matches ceil(records/limit)",
      filtered.pagination.pages,
      Math.ceil(filtered.pagination.records / filtered.pagination.limit),
    );
  }
  for (const snap of filtered.data) {
    TestValidator.equals("source_type matches", snap.source_type, sourceType);
    if (body.sourceOrderItemId !== undefined) {
      TestValidator.equals(
        "order_item linkage matches",
        snap.source_order_item_id,
        body.sourceOrderItemId,
      );
    }
    if (body.sourceOrderId !== undefined) {
      TestValidator.equals(
        "order linkage matches",
        snap.source_order_id,
        body.sourceOrderId,
      );
    }
    if (body.sourceReviewId !== undefined) {
      TestValidator.equals(
        "review linkage matches",
        snap.source_review_id,
        body.sourceReviewId,
      );
    }
    if (body.sourceCancellationRequestId !== undefined) {
      TestValidator.equals(
        "cancellation linkage matches",
        snap.source_cancellation_request_id,
        body.sourceCancellationRequestId,
      );
    }
    if (body.sourceRefundRequestId !== undefined) {
      TestValidator.equals(
        "refund linkage matches",
        snap.source_refund_request_id,
        body.sourceRefundRequestId,
      );
    }
  }
  // 5) Visibility edge expectation: filtered results should be subset of unfiltered results for the same sourceType
  const broadSame = broad.data.filter((x) => x.source_type === sourceType);
  const broadIdSet = new Set(broadSame.map((x) => x.id));
  for (const x of filtered.data) {
    TestValidator.predicate(
      "filtered id exists in unfiltered same-source results",
      broadIdSet.has(x.id),
    );
  }
}
