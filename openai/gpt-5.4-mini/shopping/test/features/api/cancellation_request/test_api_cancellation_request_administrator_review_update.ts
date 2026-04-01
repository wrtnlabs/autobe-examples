import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function test_api_cancellation_request_administrator_review_update(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const reviewerNote = RandomGenerator.paragraph({ sentences: 2 });
  const approvedBody = {
    status: "approved",
    reviewResult: "approved",
    reviewerNote,
  } satisfies IMallPlatformCancellationRequest.IUpdate;
  const approved =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.putByOrderitemidAndCancellationrequestid(
      administratorConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: approvedBody,
      },
    );
  typia.assert(approved);
  TestValidator.equals(
    "approved request order item id",
    approved.orderItem.id,
    orderItemId,
  );
  TestValidator.equals("approved request id", approved.id, approved.id);
  TestValidator.equals(
    "approved request status",
    approved.status,
    approvedBody.status,
  );
  TestValidator.equals(
    "approved request review result",
    approved.reviewResult,
    approvedBody.reviewResult,
  );
  TestValidator.equals(
    "approved request reviewer note",
    approved.reviewerNote,
    approvedBody.reviewerNote,
  );
  TestValidator.predicate(
    "approved request reviewed timestamp exists",
    approved.reviewedAt !== null,
  );
  TestValidator.predicate(
    "approved request reviewer exists",
    approved.reviewer !== null,
  );
  const rejectedOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const rejectedCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  const rejectedReviewerNote = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedBody = {
    status: "rejected",
    reviewResult: "rejected",
    reviewerNote: rejectedReviewerNote,
  } satisfies IMallPlatformCancellationRequest.IUpdate;
  const rejected =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.putByOrderitemidAndCancellationrequestid(
      administratorConnection,
      {
        orderItemId: rejectedOrderItemId,
        cancellationRequestId: rejectedCancellationRequestId,
        body: rejectedBody,
      },
    );
  typia.assert(rejected);
  TestValidator.equals(
    "rejected request order item id",
    rejected.orderItem.id,
    rejectedOrderItemId,
  );
  TestValidator.equals(
    "rejected request status",
    rejected.status,
    rejectedBody.status,
  );
  TestValidator.equals(
    "rejected request review result",
    rejected.reviewResult,
    rejectedBody.reviewResult,
  );
  TestValidator.equals(
    "rejected request reviewer note",
    rejected.reviewerNote,
    rejectedBody.reviewerNote,
  );
  TestValidator.predicate(
    "rejected request reviewed timestamp exists",
    rejected.reviewedAt !== null,
  );
  TestValidator.predicate(
    "rejected request reviewer exists",
    rejected.reviewer !== null,
  );
}
