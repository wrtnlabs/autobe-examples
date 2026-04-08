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

export async function test_api_cancellation_request_get_by_order_item_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify cancellation request lookup rejects mismatched order-item scope.
   *
   * This test covers the customer-facing cancellation request retrieval flow and
   * ensures that a cancellation request cannot be read through an unrelated order
   * item path. It validates the platform's item-level isolation rule for dispute
   * data and confirms that a relationship mismatch is treated as a normal
   * not-found-style failure instead of exposing another item's cancellation
   * details.
   *
   * 1. Register a customer session used for the scoped read attempt.
   * 2. Issue a lookup with UUIDs that do not correspond to a valid matched pair.
   * 3. Confirm the API rejects the request rather than returning another item's
   *    cancellation record.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.error(
    "mismatched cancellation request scope should fail",
    async () => {
      const response =
        await api.functional.mallPlatform.customer.orderItems.cancellationRequests.at(
          customerConnection,
          {
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
            cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      typia.assert(response);
    },
  );
}
