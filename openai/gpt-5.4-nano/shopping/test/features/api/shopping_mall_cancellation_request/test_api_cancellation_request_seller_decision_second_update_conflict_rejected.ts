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

export async function test_api_cancellation_request_seller_decision_second_update_conflict_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Obtain a cancellation request id by attempting an update.
  //    (No dedicated fetch/create API was provided in the prompt.)
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const firstDecisionStatus = "approved";
  const firstSellerResponseReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstUpdate =
    await api.functional.shoppingMall.member.cancellation_requests.update(
      memberConnection,
      {
        cancellationRequestId,
        body: {
          status: firstDecisionStatus,
          seller_response_reason: firstSellerResponseReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  const {
    status: statusAfterFirst,
    sellerDecisionedAt,
    sellerResponseReason,
    updatedAt,
  } = firstUpdate;
  TestValidator.predicate(
    "sellerDecisionedAt should be decided after first update",
    sellerDecisionedAt !== null,
  );
  // 3) Second update attempts contradictory outcome
  const secondDecisionStatus = "rejected";
  const secondSellerResponseReason = RandomGenerator.paragraph({
    sentences: 1,
  });
  await TestValidator.httpError(
    "second decision update should be rejected due to finalization",
    [400, 403, 409],
    async () => {
      await api.functional.shoppingMall.member.cancellation_requests.update(
        memberConnection,
        {
          cancellationRequestId,
          body: {
            status: secondDecisionStatus,
            seller_response_reason: secondSellerResponseReason,
          } satisfies IShoppingMallCancellationRequest.IUpdate,
        },
      );
    },
  );
  // 4) Validate stored data stability by re-applying the same decision outcome.
  const thirdUpdate =
    await api.functional.shoppingMall.member.cancellation_requests.update(
      memberConnection,
      {
        cancellationRequestId,
        body: {
          status: statusAfterFirst,
          seller_response_reason: sellerResponseReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(thirdUpdate);
  TestValidator.equals(
    "status should remain unchanged",
    thirdUpdate.status,
    statusAfterFirst,
  );
  TestValidator.equals(
    "sellerDecisionedAt should remain unchanged",
    thirdUpdate.sellerDecisionedAt,
    sellerDecisionedAt,
  );
  TestValidator.equals(
    "sellerResponseReason should remain unchanged",
    thirdUpdate.sellerResponseReason,
    sellerResponseReason,
  );
  TestValidator.equals(
    "updatedAt should not advance after rejected attempt",
    thirdUpdate.updatedAt,
    updatedAt,
  );
}
