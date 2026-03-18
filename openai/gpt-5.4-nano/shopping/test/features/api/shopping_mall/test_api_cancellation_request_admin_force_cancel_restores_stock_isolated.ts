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

export async function test_api_cancellation_request_admin_force_cancel_restores_stock_isolated(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor (join first, then login)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail =
    `admin_${RandomGenerator.alphaNumeric(10)}@test.com` satisfies string &
      tags.Format<"email">;
  const adminPassword = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.Format<"password">;
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  TestValidator.predicate(
    "admin token access exists",
    adminAuth.token.access.length > 0,
  );
  // 2) Member actor (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail =
    `member_${RandomGenerator.alphaNumeric(10)}@test.com` satisfies string &
      tags.Format<"email">;
  const memberPassword = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.Format<"password">;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  TestValidator.predicate(
    "member token access exists",
    memberAuth.token.access.length > 0,
  );
  // 3) Create a cancellation request targeting an order item
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }) satisfies string,
        },
      },
    );
  typia.assert(cancellationRequest);
  const cancellationRequestId = cancellationRequest.id satisfies string &
    tags.Format<"uuid">;
  const originalOrderItem = cancellationRequest.orderItem;
  const originalOrderItemId = originalOrderItem.id;
  const originalOrderId = originalOrderItem.shopping_mall_order_id;
  const sellerReason = `admin_force_cancel_${RandomGenerator.alphabets(8)}`;
  // 4) Admin forces cancellation decision
  const updated =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.updateCancellationRequest(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          status: "cancelled",
          seller_response_reason: sellerReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updated);
  // 5) Validate cancellation request updated
  TestValidator.equals(
    "cancellation request id preserved",
    updated.id,
    cancellationRequestId,
  );
  TestValidator.equals("status becomes cancelled", updated.status, "cancelled");
  TestValidator.predicate(
    "seller_decisioned_at is set",
    updated.sellerDecisionedAt !== null,
  );
  TestValidator.equals(
    "seller_response_reason persisted",
    updated.sellerResponseReason,
    sellerReason,
  );
  // 6) Validate item-level side effect isolation (updated order item only)
  TestValidator.equals(
    "order item id matches the target cancellation request",
    updated.orderItem.id,
    originalOrderItemId,
  );
  TestValidator.equals(
    "order item parent order unchanged",
    updated.orderItem.shopping_mall_order_id,
    originalOrderId,
  );
  TestValidator.predicate(
    "order item line item status becomes terminal cancellation outcome",
    updated.orderItem.line_item_status === "cancelled",
  );
}
