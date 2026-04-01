import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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

export async function test_api_refund_request_not_found_and_history_preserved(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(20),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const refundRequest =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  await TestValidator.httpError(
    "non-existent refund request should not be found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.refundRequests.at(
        customerConnection,
        {
          refundRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  const reloginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(reloginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(20),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const found = await api.functional.mallPlatform.customer.refundRequests.at(
    customerConnection,
    {
      refundRequestId: refundRequest.id,
    },
  );
  typia.assert(found);
  TestValidator.equals(
    "refund request id should match",
    found.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request reason should match",
    found.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "refund request status should match",
    found.status,
    refundRequest.status,
  );
  TestValidator.equals(
    "refund request order item should match",
    found.orderItem.id,
    refundRequest.orderItem.id,
  );
  TestValidator.equals(
    "refund request customer should match",
    found.customer.id,
    refundRequest.customer.id,
  );
}
