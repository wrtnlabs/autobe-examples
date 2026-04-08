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

export async function test_api_refund_request_creation_for_delivered_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: `https://example.com/register/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(6)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId },
        body: { reason } satisfies IMallPlatformRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request is created for the targeted order item",
    refundRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "refund request reason matches the submitted reason",
    refundRequest.reason,
    reason,
  );
  TestValidator.equals(
    "refund request starts as pending review",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request is linked to the authenticated customer",
    refundRequest.customer.email,
    refundRequest.customer.email,
  );
  TestValidator.predicate(
    "refund request is linked to a seller",
    refundRequest.seller.id.length > 0,
  );
  TestValidator.equals(
    "refund request has no administrator reviewer initially",
    refundRequest.administrator,
    null,
  );
  TestValidator.equals(
    "refund request review note is initially empty",
    refundRequest.reviewNote,
    null,
  );
  TestValidator.equals(
    "refund request review timestamp is initially empty",
    refundRequest.reviewedAt,
    null,
  );
  TestValidator.predicate(
    "refund request createdAt timestamp is populated",
    refundRequest.createdAt.length > 0,
  );
  TestValidator.predicate(
    "refund request updatedAt timestamp is populated",
    refundRequest.updatedAt.length > 0,
  );
  TestValidator.equals(
    "refund request is not deleted",
    refundRequest.deletedAt,
    null,
  );
}
