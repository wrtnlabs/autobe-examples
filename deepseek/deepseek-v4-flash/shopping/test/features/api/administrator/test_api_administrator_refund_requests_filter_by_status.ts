import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refund_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Test filtering by pending status
  const pendingPage =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  for (const record of pendingPage.data) {
    TestValidator.equals("status is pending", record.status, "pending");
    TestValidator.equals(
      "response_timestamp is null for pending",
      record.response_timestamp,
      null,
    );
    TestValidator.equals(
      "snapshots_count is 0 for pending",
      record.snapshots_count,
      0,
    );
  }
  // 3. Test filtering by approved status
  const approvedPage =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  for (const record of approvedPage.data) {
    TestValidator.equals("status is approved", record.status, "approved");
    TestValidator.predicate(
      "response_timestamp is set for approved",
      record.response_timestamp !== null,
    );
    TestValidator.predicate(
      "snapshots_count >= 1 for approved",
      record.snapshots_count >= 1,
    );
  }
  // 4. Test filtering by rejected status
  const rejectedPage =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedPage);
  for (const record of rejectedPage.data) {
    TestValidator.equals("status is rejected", record.status, "rejected");
    TestValidator.predicate(
      "response_timestamp is set for rejected",
      record.response_timestamp !== null,
    );
    TestValidator.predicate(
      "snapshots_count >= 1 for rejected",
      record.snapshots_count >= 1,
    );
  }
  // 5. Test filtering by multiple statuses (pending and approved)
  const multiPage =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: ["pending", "approved"] satisfies (
            | "pending"
            | "approved"
            | "rejected"
          )[] &
            tags.UniqueItems,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(multiPage);
  for (const record of multiPage.data) {
    TestValidator.predicate(
      "status is either pending or approved (not rejected)",
      record.status === "pending" || record.status === "approved",
    );
  }
}
