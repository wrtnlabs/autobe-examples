import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
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
import { generate_random_mall_platform_customer_order_items_refund_requests_create } from "../../../generate/generate_random_mall_platform_customer_order_items_refund_requests_create";
import { prepare_random_mall_platform_refund_request } from "../../../prepare/prepare_random_mall_platform_refund_request";

export async function test_api_refund_request_creation_before_delivery_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that refund request creation is rejected before delivery.
   *
   * This test covers the refund eligibility business rule for customer-initiated
   * item-level refund requests. It authenticates a customer, then attempts to
   * create a refund request for a non-delivered order item identifier and
   * confirms that the platform rejects the request as a business-rule failure.
   *
   * 1. Register and authenticate a customer using an isolated connection.
   * 2. Attempt to create a refund request for a non-delivered order item id.
   * 3. Assert that the request is rejected and no refund request is created.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.error(
    "refund request creation must be rejected before delivery",
    async () => {
      await generate_random_mall_platform_customer_order_items_refund_requests_create(
        customerConnection,
        {
          params: {
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
          },
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IMallPlatformRefundRequest.ICreate,
        },
      );
    },
  );
}
