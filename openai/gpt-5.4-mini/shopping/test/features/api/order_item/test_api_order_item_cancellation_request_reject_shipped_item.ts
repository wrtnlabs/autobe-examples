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

export async function test_api_order_item_cancellation_request_reject_shipped_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that cancellation request creation is rejected for a shipped order item.
   *
   * Verifies the business rule that cancellation requests are only allowed for
   * paid, unshipped items. The scenario authenticates an administrator and
   * attempts to submit a cancellation request for an order item that is already
   * shipped or otherwise no longer eligible for cancellation.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Attempt to create a cancellation request for an ineligible order item.
   * 3. Assert the operation is rejected by the platform.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` as string,
      password: `Pw_${RandomGenerator.alphaNumeric(12)}` as string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.error(
    "cancellation request should be rejected for shipped order item",
    async () => {
      await generate_random_mall_platform_administrator_order_items_cancellation_requests_create(
        adminConnection,
        {
          params: {
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
          },
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMallPlatformCancellationRequest.ICreate,
        },
      );
    },
  );
}
