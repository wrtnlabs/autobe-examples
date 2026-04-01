import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_snapshot_history_listing(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.administrator.join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.seller.join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const approvedRefundRequest =
    await api.functional.mallPlatform.seller.refundRequests.approve.create(
      sellerConnection,
      { refundRequestId },
    );
  typia.assert(approvedRefundRequest);
  const liveBefore = typia.assert(
    approvedRefundRequest as unknown as IMallPlatformRefundRequest,
  );
  const response =
    await api.functional.mallPlatform.administrator.refundRequests.snapshots.index(
      administratorConnection,
      {
        refundRequestId,
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IMallPlatformRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history is not empty",
    response.data.length > 0,
  );
  const firstSnapshot = response.data[0];
  TestValidator.equals(
    "snapshot is for the requested refund request",
    firstSnapshot.refundRequest.id,
    refundRequestId,
  );
  TestValidator.predicate(
    "snapshot reason is recorded",
    firstSnapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "status before is recorded",
    firstSnapshot.statusBefore.length > 0,
  );
  TestValidator.predicate(
    "status after is recorded",
    firstSnapshot.statusAfter.length > 0,
  );
  TestValidator.predicate(
    "reviewer role is recorded or null only when appropriate",
    firstSnapshot.reviewerRole === null ||
      firstSnapshot.reviewerRole.length > 0,
  );
  TestValidator.predicate(
    "reviewer note is recorded or null only when appropriate",
    firstSnapshot.reviewerNote === null ||
      firstSnapshot.reviewerNote.length > 0,
  );
  TestValidator.predicate(
    "snapshot creation time is recorded",
    firstSnapshot.createdAt.length > 0,
  );
  TestValidator.equals(
    "live refund request remains the same after snapshot listing",
    approvedRefundRequest.id,
    liveBefore.id,
  );
  TestValidator.equals(
    "live refund request status remains the approved response state",
    approvedRefundRequest.status,
    liveBefore.status,
  );
}
