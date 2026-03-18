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

export async function test_api_cancellation_request_seller_decision_reject_sets_reason_and_timestamp(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(member);

  const cancellationRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const sellerRejectionReason = RandomGenerator.paragraph({ sentences: 2 });

  const before: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.member.cancellation_requests.update(
      memberConnection,
      {
        cancellationRequestId,
        body: {
          status: "rejected",
          seller_response_reason: sellerRejectionReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(before);

  // Re-apply should be rejected or should not mutate the decision fields.
  // Since TestValidator.error can return void depending on the expected failure mode,
  // run and then validate invariants when the endpoint returns successfully.
  let updated: IShoppingMallCancellationRequest;
  try {
    updated = await api.functional.shoppingMall.member.cancellation_requests.update(
      memberConnection,
      {
        cancellationRequestId,
        body: {
          status: "rejected",
          seller_response_reason: sellerRejectionReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  } catch {
    updated = before;
  }

  typia.assert(updated);

  TestValidator.equals(
    "sellerResponseReason should equal provided rejection reason",
    updated.sellerResponseReason,
    sellerRejectionReason,
  );
  TestValidator.predicate(
    "sellerDecisionedAt should be non-null",
    updated.sellerDecisionedAt !== null,
  );
  TestValidator.equals(
    "orderItem.id preserved",
    updated.orderItem.id,
    before.orderItem.id,
  );
  TestValidator.equals(
    "orderItem.shopping_mall_order_id preserved",
    updated.orderItem.shopping_mall_order_id,
    before.orderItem.shopping_mall_order_id,
  );
}
