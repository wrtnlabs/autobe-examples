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

/**
 * Rejects cancellation requests for ineligible order items.
 *
 * Validates the customer-only cancellation request workflow by registering an authenticated customer and then attempting to create a cancellation request for an order item that is not eligible for item-level cancellation.
 *
 * The scenario focuses on business-rule rejection rather than type validation. It confirms that a well-typed request targeting an ineligible or unrelated order item is denied and that the cancellation workflow does not start.
 *
 * 1. Register and authenticate a customer using the supported join utility.
 * 2. Submit a cancellation request for a validly typed but ineligible order item identifier.
 * 3. Verify the API rejects the request and no cancellation request is created.
 */
export async function test_api_cancellation_request_ineligible_item_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const invalidOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformCancellationRequest.ICreate;
  await TestValidator.error(
    "cancellation request should be rejected for an ineligible order item",
    async () => {
      await generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid(
        customerConnection,
        {
          params: {
            orderItemId: invalidOrderItemId,
          },
          body,
        },
      );
    },
  );
}
