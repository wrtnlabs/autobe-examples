import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_requests_create_rejects_cross_member_order_item(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberA: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: memberAEmail,
        password: memberAPassword,
      },
    },
  );
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberB: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: memberBEmail,
        password: memberBPassword,
      },
    },
  );
  typia.assert(memberB);
  // Prepare an order item that belongs to Member A.
  // We don't have a dedicated order-item generator in inputs,
  // so we use a valid cancellation request creation as a way
  // to obtain a target order item owned by Member A.
  const aOwnedCancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberAConnection,
      {},
    );
  typia.assert(aOwnedCancellationRequest);
  const targetOrderItemId = aOwnedCancellationRequest.shoppingMallOrderItemId;
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error(
    "should reject cross-member cancellation request creation",
    async () => {
      await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
        memberBConnection,
        {
          body: {
            orderItemId: targetOrderItemId,
            reason,
          } satisfies IShoppingMallCancellationRequest.ICreate,
        },
      );
    },
  );
}
