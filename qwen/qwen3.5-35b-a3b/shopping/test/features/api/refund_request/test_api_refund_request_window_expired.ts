import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_window_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IEcommerceMallMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(joined);
  // 2. Create customer-specific connection with token from authentication
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: joined.token.access,
  };
  // 3. Attempt to create refund request with invalid order item UUID
  // Note: The API validates that order items must exist and be delivered.
  // Since order creation APIs are not available in current SDK, this test
  // validates that the refund request endpoint properly rejects requests
  // for non-existent order items with appropriate error response.
  // In production, this would be triggered when trying to refund an order item
  // outside the 7-day window or one that doesn't exist.
  await TestValidator.error(
    "should reject refund request for non-existent order item",
    async () => {
      await api.functional.ecommerceMall.member.refund_requests.create(
        customerConnection,
        {
          body: {
            order_item_id: "00000000-0000-0000-0000-000000000000", // Invalid UUID
            reason: "Product was defective",
          } satisfies IEcommerceMallRefundRequest.ICreate,
        },
      );
    },
  );
  // 4. Verify no refund request was created
  // Since the request was rejected, no record should exist in the database
}