import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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

export async function test_api_cancellation_request_decision_approval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const reviewerNote = RandomGenerator.paragraph({ sentences: 2 });
  const response =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.decision.create(
      adminConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: {
          decision: true,
          reviewerNote,
        } satisfies IMallPlatformCancellationRequest.IDecision,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "cancellation request id should match",
    response.id,
    cancellationRequestId,
  );
  TestValidator.equals(
    "cancellation request should be approved",
    response.status,
    "approved",
  );
  TestValidator.equals(
    "cancellation request should belong to the targeted order item",
    response.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "order item should be cancelled",
    response.orderItem.status,
    "cancelled",
  );
  TestValidator.equals(
    "reviewer note should be stored",
    response.reviewerNote,
    reviewerNote,
  );
  TestValidator.predicate(
    "reviewed timestamp should exist",
    response.reviewedAt !== null,
  );
  TestValidator.predicate(
    "review result should exist",
    response.reviewResult !== null,
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    response.reviewer !== null,
  );
  TestValidator.predicate(
    "linked order should exist",
    response.orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "product variant should exist",
    response.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "seller should exist",
    response.orderItem.seller.id.length > 0,
  );
  TestValidator.predicate(
    "request should not be deleted",
    response.deletedAt === null,
  );
  TestValidator.predicate(
    "request should have created timestamp",
    response.createdAt.length > 0,
  );
  TestValidator.predicate(
    "request should have updated timestamp",
    response.updatedAt.length > 0,
  );
}
