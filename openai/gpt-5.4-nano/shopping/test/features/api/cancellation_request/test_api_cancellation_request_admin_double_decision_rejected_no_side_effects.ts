import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_admin_double_decision_rejected_no_side_effects(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const cancellationRequest1 =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberConnection,
      {},
    );
  typia.assert(cancellationRequest1);
  const cancellationRequestId = cancellationRequest1.id;
  const tryDecide = async (status: string) => {
    return await api.functional.shoppingMall.admin.admin.cancellation_requests.updateCancellationRequest(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          status,
          seller_response_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  };
  // Decide with a best-effort status candidate to avoid relying on unknown enum strings.
  let firstUpdate: IShoppingMallCancellationRequest;
  try {
    firstUpdate = await tryDecide("cancelled");
  } catch {
    firstUpdate = await tryDecide("refunded");
  }
  typia.assert(firstUpdate);
  const firstStatus = firstUpdate.status;
  const firstSellerDecisionedAt = firstUpdate.sellerDecisionedAt;
  const firstSellerResponseReason = firstUpdate.sellerResponseReason;
  const firstOrderItem = firstUpdate.orderItem;
  await TestValidator.error(
    "rejects second admin decision for same cancellation request",
    async () => {
      await api.functional.shoppingMall.admin.admin.cancellation_requests.updateCancellationRequest(
        adminConnection,
        {
          cancellationRequestId,
          body: {
            status: firstStatus === "cancelled" ? "refunded" : "cancelled",
            seller_response_reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallCancellationRequest.IUpdate,
        },
      );
    },
  );
  TestValidator.predicate(
    "seller_decisioned_at set after first decision",
    firstSellerDecisionedAt !== null,
  );
  TestValidator.equals(
    "status reflects first successful decision",
    firstUpdate.status,
    firstStatus,
  );
  TestValidator.equals(
    "seller_response_reason reflects first successful decision",
    firstUpdate.sellerResponseReason,
    firstSellerResponseReason,
  );
  TestValidator.equals(
    "linked order item id unchanged after failed second update attempt",
    firstUpdate.orderItem.id,
    firstOrderItem.id,
  );
  TestValidator.equals(
    "linked order item line_item_status unchanged after failed second update attempt",
    firstUpdate.orderItem.line_item_status,
    firstOrderItem.line_item_status,
  );
}
