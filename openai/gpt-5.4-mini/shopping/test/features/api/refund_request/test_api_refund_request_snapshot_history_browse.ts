import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd",
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.customer.orderItems.refundRequests.snapshots.index(
      customerConnection,
      {
        orderItemId,
        refundRequestId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "snapshot history returns pagination metadata",
    response.pagination.current >= 1 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested page is first page by default input",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested page size is preserved",
    response.pagination.limit,
    10,
  );
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      "snapshots are sorted by newest first",
      response.data[i - 1].createdAt >= response.data[i].createdAt,
    );
  }
  for (const snapshot of response.data) {
    TestValidator.equals(
      "snapshot belongs to the requested refund request",
      snapshot.refundRequest.id,
      refundRequestId,
    );
    TestValidator.predicate(
      "snapshot includes immutable audit fields",
      snapshot.snapshotReason.length > 0 &&
        snapshot.statusBefore.length > 0 &&
        snapshot.statusAfter.length > 0 &&
        snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "review metadata fields are nullable strings",
      snapshot.reviewerRole === null ||
        typeof snapshot.reviewerRole === "string",
    );
    TestValidator.predicate(
      "review note fields are nullable strings",
      snapshot.reviewerNote === null ||
        typeof snapshot.reviewerNote === "string",
    );
  }
  const filteredResponse =
    await api.functional.mallPlatform.customer.orderItems.refundRequests.snapshots.index(
      customerConnection,
      {
        orderItemId,
        refundRequestId,
        body: {
          search: "approved",
          createdAtFrom: new Date("2020-01-01T00:00:00.000Z").toISOString(),
          createdAtTo: new Date("2030-01-01T00:00:00.000Z").toISOString(),
          sort: "createdAtAsc",
          page: 1,
          limit: 5,
        } satisfies IMallPlatformRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "filtered snapshot history returns pagination metadata",
    filteredResponse.pagination.current >= 1 &&
      filteredResponse.pagination.limit >= 0 &&
      filteredResponse.pagination.records >= 0 &&
      filteredResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "filtered page number is preserved",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered page size is preserved",
    filteredResponse.pagination.limit,
    5,
  );
  for (const snapshot of filteredResponse.data) {
    TestValidator.equals(
      "filtered snapshots belong to the requested refund request",
      snapshot.refundRequest.id,
      refundRequestId,
    );
    TestValidator.predicate(
      "filtered snapshots still contain audit fields",
      snapshot.snapshotReason.length > 0 && snapshot.createdAt.length > 0,
    );
  }
}
