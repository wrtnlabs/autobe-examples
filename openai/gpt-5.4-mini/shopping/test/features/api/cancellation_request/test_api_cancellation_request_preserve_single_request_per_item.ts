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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_mall_platform_customer_order_items_cancellation_requests_create";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

export async function test_api_cancellation_request_preserve_single_request_per_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const administratorConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const initialReason = RandomGenerator.paragraph({ sentences: 2 });
  const initialRequest =
    await generate_random_mall_platform_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { orderItemId },
        body: {
          reason: initialReason,
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(initialRequest);
  TestValidator.equals(
    "initial request is tied to the expected order item",
    initialRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "initial request stores the submitted reason",
    initialRequest.reason,
    initialReason,
  );
  const firstUpdateReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstUpdatedRequest =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.patchByOrderitemid(
      administratorConnection,
      {
        orderItemId,
        body: {
          reason: firstUpdateReason,
        } satisfies IMallPlatformCancellationRequest.IUpdate,
      },
    );
  typia.assert(firstUpdatedRequest);
  TestValidator.equals(
    "first update remains tied to the same order item",
    firstUpdatedRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "first update stores the latest reason",
    firstUpdatedRequest.reason,
    firstUpdateReason,
  );
  const secondUpdateReason = RandomGenerator.paragraph({ sentences: 4 });
  const secondUpdatedRequest =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.patchByOrderitemid(
      administratorConnection,
      {
        orderItemId,
        body: {
          reason: secondUpdateReason,
          reviewResult: null,
          reviewerNote: null,
        } satisfies IMallPlatformCancellationRequest.IUpdate,
      },
    );
  typia.assert(secondUpdatedRequest);
  TestValidator.equals(
    "second update remains tied to the same order item",
    secondUpdatedRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "second update stores the newest reason",
    secondUpdatedRequest.reason,
    secondUpdateReason,
  );
  TestValidator.notEquals(
    "the request content should change after the repeated patch",
    initialRequest.reason,
    secondUpdatedRequest.reason,
  );
  TestValidator.equals(
    "the cancellation request remains item scoped after repeated patching",
    secondUpdatedRequest.orderItem.id,
    initialRequest.orderItem.id,
  );
}
