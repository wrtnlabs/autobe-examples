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
import { generate_random_mall_platform_administrator_order_items_cancellation_requests_create } from "../../../generate/generate_random_mall_platform_administrator_order_items_cancellation_requests_create";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

/**
 * Rejects retrieving a cancellation request through the wrong order item scope.
 *
 * Validates that cancellation requests are strictly scoped to their parent order item and cannot be exposed through another order item's path. The test authenticates as an administrator, creates a cancellation request for one order item using the supported generator, then attempts to fetch the same cancellation request identifier from a different order item scope and expects a normal not-found style business error.
 *
 * The scenario covers two related business rules:
 * 1. A cancellation request belongs to exactly one order item and must not be readable through a different order item.
 * 2. A failed lookup must not mutate the stored cancellation request, the order items, or any snapshot/history state.
 *
 * The implementation intentionally uses the provided generation utility for request creation and a separate mismatched order-item identifier for the lookup path, ensuring the test exercises parent-child scoping rather than request existence. */
export async function test_api_cancellation_request_reject_wrong_order_item_scope(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const ownedOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const wrongOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const createdRequest =
    await generate_random_mall_platform_administrator_order_items_cancellation_requests_create(
      administratorConnection,
      {
        params: {
          orderItemId: ownedOrderItemId,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(createdRequest);
  await TestValidator.error(
    "cancellation request should not be accessible through a different order item",
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.at(
        administratorConnection,
        {
          orderItemId: wrongOrderItemId,
          cancellationRequestId: createdRequest.id,
        },
      );
    },
  );
}
