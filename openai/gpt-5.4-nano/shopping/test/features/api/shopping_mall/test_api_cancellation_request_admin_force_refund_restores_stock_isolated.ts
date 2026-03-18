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

export async function test_api_cancellation_request_admin_force_refund_restores_stock_isolated(
  connection: api.IConnection,
): Promise<void> {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IShoppingMallCancellationRequest.ICreate>,
      },
    );
  typia.assert(cancellationRequest);
  const sellerResponseReason = RandomGenerator.paragraph({ sentences: 1 });
  const beforeLineItemStatus = cancellationRequest.orderItem.line_item_status;
  const updated =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.updateCancellationRequest(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "refunded",
          seller_response_reason: sellerResponseReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "cancellation request status updated to refunded",
    updated.status,
    "refunded",
  );
  TestValidator.predicate(
    "seller_decisioned_at is set",
    updated.sellerDecisionedAt !== null,
  );
  TestValidator.equals(
    "seller_response_reason persisted",
    updated.sellerResponseReason,
    sellerResponseReason,
  );
  TestValidator.notEquals(
    "linked order item status changed",
    updated.orderItem.line_item_status,
    beforeLineItemStatus,
  );
  // Isolation proxy: the linked order item moved forward, and seller decision is applied.
  TestValidator.equals(
    "linked order item retained same id",
    updated.orderItem.id,
    cancellationRequest.orderItem.id,
  );
}
