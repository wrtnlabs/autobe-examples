import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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
import { generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid } from "../../../generate/generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

export async function test_api_cancellation_request_duplicate_active_request_blocked(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const firstBody = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformCancellationRequest.ICreate;
  const firstRequest =
    await generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid(
      customerConnection,
      {
        params: { orderItemId },
        body: firstBody,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request reason",
    firstRequest.reason,
    firstBody.reason,
  );
  TestValidator.predicate(
    "first request is created for a cancellation workflow",
    firstRequest.id.length > 0,
  );
  TestValidator.predicate(
    "first request is linked to an order item",
    firstRequest.orderItem.id.length > 0,
  );
  await TestValidator.error(
    "duplicate active cancellation request is blocked",
    async () => {
      await generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid(
        customerConnection,
        {
          params: { orderItemId },
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IMallPlatformCancellationRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original request remains unchanged",
    firstRequest.reason,
    firstBody.reason,
  );
}
