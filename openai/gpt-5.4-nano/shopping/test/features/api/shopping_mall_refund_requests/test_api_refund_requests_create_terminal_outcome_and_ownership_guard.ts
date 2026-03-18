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

export async function test_api_refund_requests_create_terminal_outcome_and_ownership_guard(
  connection: api.IConnection,
): Promise<void> {
  // Actor A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  // Actor B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberB);
  // Scenario 1: create a refund request for member A, then attempt a second creation for the same orderItemId.
  const requestA1 =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberAConnection,
      {
        body: {
          customerReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IShoppingMallRefundRequest.ICreate>,
      },
    );
  typia.assert(requestA1);
  await TestValidator.error(
    "terminal-outcome/conflict guard blocks second refund request for the same orderItemId",
    async () => {
      await generate_random_shopping_mall_member_refund_requests_create(
        memberAConnection,
        {
          body: {
            orderItemId: requestA1.shoppingMallOrderItemId,
            customerReason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    },
  );
  // Scenario 2: ownership mismatch guard blocks creating a refund request for member B's order item.
  const requestB1 =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberBConnection,
      {
        body: {
          customerReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IShoppingMallRefundRequest.ICreate>,
      },
    );
  typia.assert(requestB1);
  await TestValidator.error(
    "ownership mismatch guard blocks creating refund request for another member's orderItemId",
    async () => {
      await generate_random_shopping_mall_member_refund_requests_create(
        memberAConnection,
        {
          body: {
            orderItemId: requestB1.shoppingMallOrderItemId,
            customerReason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    },
  );
}
