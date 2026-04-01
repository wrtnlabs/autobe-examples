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

export async function test_api_cancellation_request_retrieve_by_order_item(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.at(
      adminConnection,
      {
        orderItemId,
        cancellationRequestId,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "response cancellation request id",
    response.id,
    cancellationRequestId,
  );
  TestValidator.equals(
    "response order item id",
    response.orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "response reason is non-empty",
    response.reason.length > 0,
  );
  TestValidator.predicate(
    "response status is non-empty",
    response.status.length > 0,
  );
  TestValidator.predicate(
    "createdAt is present",
    response.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is present",
    response.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is null or a timestamp",
    response.deletedAt === null || response.deletedAt.length > 0,
  );
  TestValidator.predicate(
    "reviewedAt is null or a timestamp",
    response.reviewedAt === null || response.reviewedAt.length > 0,
  );
  TestValidator.predicate(
    "reviewResult is null or non-empty",
    response.reviewResult === null || response.reviewResult.length > 0,
  );
  TestValidator.predicate(
    "reviewerNote is null or non-empty",
    response.reviewerNote === null || response.reviewerNote.length > 0,
  );
  TestValidator.predicate(
    "reviewer is null or has identity",
    response.reviewer === null || response.reviewer.id.length > 0,
  );
  await TestValidator.error(
    "rejects cross-item cancellation request lookup",
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.at(
        adminConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
