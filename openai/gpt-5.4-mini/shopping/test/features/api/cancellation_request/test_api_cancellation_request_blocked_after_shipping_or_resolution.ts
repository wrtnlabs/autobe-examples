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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_blocked_after_shipping_or_resolution(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const initialBody = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformCancellationRequest.IUpdate;
  const createdRequest =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.update(
      customerConnection,
      {
        orderItemId,
        body: initialBody,
      },
    );
  typia.assert(createdRequest);
  TestValidator.equals(
    "cancellation request reason should match",
    createdRequest.reason,
    initialBody.reason,
  );
  TestValidator.equals(
    "cancellation request should belong to the requested order item",
    createdRequest.orderItem.id,
    orderItemId,
  );
  const updatedBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IMallPlatformCancellationRequest.IUpdate;
  const updatedRequest =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.update(
      customerConnection,
      {
        orderItemId,
        body: updatedBody,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals(
    "updated cancellation request should stay on same order item",
    updatedRequest.orderItem.id,
    createdRequest.orderItem.id,
  );
  TestValidator.equals(
    "updated cancellation request should replace the reason",
    updatedRequest.reason,
    updatedBody.reason,
  );
  await TestValidator.error(
    "should reject a cancellation request for an already-resolved item state",
    async () => {
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.update(
        customerConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IMallPlatformCancellationRequest.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "should reject a cancellation request for an already-shipped item state",
    async () => {
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.update(
        customerConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IMallPlatformCancellationRequest.IUpdate,
        },
      );
    },
  );
}
