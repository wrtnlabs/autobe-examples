import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_requests_create_eligible_delivered_order_item(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Authenticate member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberARefundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberAConnection,
      {},
    );
  typia.assert(memberARefundRequest);
  // Scenario 1 validations (as far as possible with available info)
  TestValidator.equals(
    "sellerComment should be null for undecided refund request",
    memberARefundRequest.sellerComment,
    null,
  );
  TestValidator.equals(
    "decisionedAt should be null for undecided refund request",
    memberARefundRequest.decisionedAt,
    null,
  );
  TestValidator.equals(
    "deletedAt should be null for non-deleted refund request",
    memberARefundRequest.deletedAt,
    null,
  );
  TestValidator.predicate(
    "status should be non-empty",
    memberARefundRequest.status.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be >= createdAt",
    memberARefundRequest.updatedAt >= memberARefundRequest.createdAt,
  );
  // Scenario 2 (best-effort): second creation for the same order item should be rejected
  await TestValidator.error(
    "second refund request creation for same order item should be rejected",
    async () => {
      await generate_random_shopping_mall_member_refund_requests_create(
        memberAConnection,
        {
          body: {
            orderItemId: memberARefundRequest.shoppingMallOrderItemId,
            customerReason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    },
  );
  // Scenario 3: member cannot create refund request for delivered order item they do not own
  const memberBRefundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberBConnection,
      {},
    );
  typia.assert(memberBRefundRequest);
  await TestValidator.error(
    "member should not create refund request for another member's order item",
    async () => {
      await generate_random_shopping_mall_member_refund_requests_create(
        memberAConnection,
        {
          body: {
            orderItemId: memberBRefundRequest.shoppingMallOrderItemId,
            customerReason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    },
  );
}
