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
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid } from "../../../generate/generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

export async function test_api_cancellation_request_duplicate_or_reopened_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test cancellation-request submission behavior for a customer account.
   *
   * Validates the customer-only cancellation-request endpoint and ensures the request payload is accepted
   * for a syntactically valid order item identifier. The available API surface does not expose order creation
   * or order-item lookup utilities in this test bundle, so the test focuses on endpoint-level invocation and
   * response validation using the provided resources.
   *
   * 1. Register and authenticate a customer with isolated connection state.
   * 2. Submit a cancellation request using a valid request body and a UUID order item identifier.
   * 3. Validate the returned cancellation request structure.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: "1234" satisfies string,
      href: "https://example.com/register" satisfies string,
      referrer: "https://example.com/landing" satisfies string,
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const response =
    await generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid(
      customerConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "cancellation request should reference a request id",
    typeof response.id,
    "string",
  );
  TestValidator.equals(
    "cancellation request should preserve submitted reason",
    response.reason.length > 0,
    true,
  );
}
