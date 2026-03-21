import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function test_api_admin_refund_requests_listing_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates to obtain JWT token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Test listing refund requests with "pending" status filter
  const pendingResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 3. Verify response contains pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    pendingResult.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    (pendingResult.pagination.current ?? 0) >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    (pendingResult.pagination.records ?? 0) >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    (pendingResult.pagination.pages ?? 0) >= 0,
    true,
  );
  // 4. Verify each refund request in data array includes required fields
  for (const refund of pendingResult.data) {
    typia.assert(refund);
    TestValidator.equals("has id", refund.id !== undefined, true);
    TestValidator.equals("has status", refund.status !== undefined, true);
    TestValidator.equals("has reason", refund.reason !== undefined, true);
    TestValidator.equals(
      "has created_at",
      refund.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "has orderItem summary",
      refund.orderItem !== undefined,
      true,
    );
    TestValidator.equals(
      "has seller summary",
      refund.seller !== undefined,
      true,
    );
    TestValidator.equals("status is pending", refund.status, "pending");
  }
  // 5. Test with "rejected" status filter
  const rejectedResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  for (const refund of rejectedResult.data) {
    typia.assert(refund);
    TestValidator.equals("status is rejected", refund.status, "rejected");
  }
  // 6. Test with "approved" status filter
  const approvedResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  for (const refund of approvedResult.data) {
    typia.assert(refund);
    TestValidator.equals("status is approved", refund.status, "approved");
  }
  // 7. Test without status filter (should return all)
  const allResult =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "returns data array",
    allResult.data.length >= 0,
  );
  // 8. Verify results are sorted by created_at descending (newest first)
  if (allResult.data.length > 1) {
    for (let i = 0; i < allResult.data.length - 1; i++) {
      const current = new Date(allResult.data[i].created_at).getTime();
      const next = new Date(allResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `item ${i} is newer or equal to item ${i + 1}`,
        current >= next,
      );
    }
  }
}