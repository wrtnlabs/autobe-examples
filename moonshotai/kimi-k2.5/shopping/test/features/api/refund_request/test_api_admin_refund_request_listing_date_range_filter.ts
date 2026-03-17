import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refund_request_listing_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Define ISO timestamps for date range testing
  const now = new Date("2026-03-16T07:20:13.744Z");
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(
    now.getTime() - 48 * 60 * 60 * 1000,
  ).toISOString();
  const threeDaysAgo = new Date(
    now.getTime() - 72 * 60 * 60 * 1000,
  ).toISOString();
  const fourDaysAgo = new Date(
    now.getTime() - 96 * 60 * 60 * 1000,
  ).toISOString();
  // 2. Test submittedAfter filter - should return refund requests submitted on or after the specified timestamp
  const submittedAfterResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          submittedAfter: twoDaysAgo,
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(submittedAfterResponse);
  // Verify all returned refund requests have submittedAt >= submittedAfter
  for (const refund of submittedAfterResponse.data) {
    TestValidator.predicate(
      `submittedAt ${refund.submittedAt} should be >= ${twoDaysAgo}`,
      new Date(refund.submittedAt) >= new Date(twoDaysAgo),
    );
  }
  // 3. Test submittedBefore filter - should return refund requests submitted on or before the specified timestamp
  const submittedBeforeResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          submittedBefore: twoDaysAgo,
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(submittedBeforeResponse);
  // Verify all returned refund requests have submittedAt <= submittedBefore
  for (const refund of submittedBeforeResponse.data) {
    TestValidator.predicate(
      `submittedAt ${refund.submittedAt} should be <= ${twoDaysAgo}`,
      new Date(refund.submittedAt) <= new Date(twoDaysAgo),
    );
  }
  // 4. Test combined submittedAfter and submittedBefore filter - should return refund requests within the date range
  const dateRangeResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          submittedAfter: threeDaysAgo,
          submittedBefore: oneDayAgo,
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Verify all returned refund requests fall within the specified date range
  for (const refund of dateRangeResponse.data) {
    TestValidator.predicate(
      `submittedAt ${refund.submittedAt} should be between ${threeDaysAgo} and ${oneDayAgo}`,
      new Date(refund.submittedAt) >= new Date(threeDaysAgo) &&
        new Date(refund.submittedAt) <= new Date(oneDayAgo),
    );
  }
  // 5. Test respondedAfter filter - should return refund requests with response timestamp on or after the specified time
  const respondedAfterResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          respondedAfter: fourDaysAgo,
          status: "approved",
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(respondedAfterResponse);
  // Verify all returned refund requests have respondedAt >= respondedAfter (if they have a response)
  for (const refund of respondedAfterResponse.data) {
    if (refund.hasResponse && refund.respondedAt) {
      TestValidator.predicate(
        `respondedAt ${refund.respondedAt} should be >= ${fourDaysAgo}`,
        new Date(refund.respondedAt) >= new Date(fourDaysAgo),
      );
    }
  }
  // 6. Test respondedBefore filter - should return refund requests with response timestamp on or before the specified time
  const respondedBeforeResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          respondedBefore: oneDayAgo,
          status: "rejected",
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(respondedBeforeResponse);
  // Verify all returned refund requests have respondedAt <= respondedBefore (if they have a response)
  for (const refund of respondedBeforeResponse.data) {
    if (refund.hasResponse && refund.respondedAt) {
      TestValidator.predicate(
        `respondedAt ${refund.respondedAt} should be <= ${oneDayAgo}`,
        new Date(refund.respondedAt) <= new Date(oneDayAgo),
      );
    }
  }
  // 7. Test combined date range with all filters
  const allFiltersResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          submittedAfter: fourDaysAgo,
          submittedBefore: now.toISOString(),
          respondedAfter: fourDaysAgo,
          respondedBefore: oneDayAgo,
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(allFiltersResponse);
  // Verify all filters are applied correctly
  for (const refund of allFiltersResponse.data) {
    TestValidator.predicate(
      `submittedAt ${refund.submittedAt} should be within submission range`,
      new Date(refund.submittedAt) >= new Date(fourDaysAgo) &&
        new Date(refund.submittedAt) <= new Date(now.toISOString()),
    );
    if (refund.hasResponse && refund.respondedAt) {
      TestValidator.predicate(
        `respondedAt ${refund.respondedAt} should be within response range`,
        new Date(refund.respondedAt) >= new Date(fourDaysAgo) &&
          new Date(refund.respondedAt) <= new Date(oneDayAgo),
      );
    }
  }
  // 8. Test default sorting by submission time descending
  const defaultSortResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(defaultSortResponse);
  // Verify results are sorted by submission time descending (newest first)
  for (let i = 1; i < defaultSortResponse.data.length; i++) {
    const prev = defaultSortResponse.data[i - 1];
    const curr = defaultSortResponse.data[i];
    TestValidator.predicate(
      `results should be sorted by submittedAt descending: ${prev.submittedAt} >= ${curr.submittedAt}`,
      new Date(prev.submittedAt) >= new Date(curr.submittedAt),
    );
  }
}
