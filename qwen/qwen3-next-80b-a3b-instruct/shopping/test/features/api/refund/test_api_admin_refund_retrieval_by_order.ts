import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { prepare_random_shopping_mall_order_refund } from "../../../prepare/prepare_random_shopping_mall_order_refund";
import { generate_random_shopping_mall_admin_orders_refunds_create } from "../../../generate/generate_random_shopping_mall_admin_orders_refunds_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_refund_retrieval_by_order(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate an orderCode in the expected format (like "ORD-2026-000123")
  // According to the DTO definition, orderCode is a string in this format
  const orderCode = `ORD-${new Date().getFullYear()}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  // Step 3: Create refund request using admin connection with the generated orderCode
  const refundRequest: IShoppingMallOrderRefund =
    await generate_random_shopping_mall_admin_orders_refunds_create(
      adminConnection,
      {
        body: {
          orderCode,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          refund_amount: typia.random<
            number & tags.Minimum<0> & tags.Maximum<10000>
          >(),
          refund_type: RandomGenerator.pick(["full", "partial"] as const),
          return_items: [RandomGenerator.alphaNumeric(16)],
          return_reason_code: RandomGenerator.pick([
            "DAMAGED",
            "WRONG_ITEM",
            "NO_LONGER_NEEDED",
            "DUPLICATE_PAYMENT",
          ] as const),
          return_ship_method: RandomGenerator.alphaNumeric(8),
        } satisfies IShoppingMallOrderRefund.ICreate,
        params: {
          orderCode,
        },
      },
    );
  typia.assert(refundRequest);
  // Step 4: Retrieve the refund using admin connection with orderCode and refundCode
  const retrievedRefund: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.admin.orders.refunds.at(adminConnection, {
      orderCode: refundRequest.order_code,
      refundCode: refundRequest.refund_code,
    });
  typia.assert(retrievedRefund);
  // Step 5: Validate that retrieved refund matches original refund request
  TestValidator.equals(
    "retrieved refund order code matches",
    retrievedRefund.order_code,
    refundRequest.order_code,
  );
  TestValidator.equals(
    "retrieved refund refund code matches",
    retrievedRefund.refund_code,
    refundRequest.refund_code,
  );
  TestValidator.equals(
    "retrieved refund amount matches",
    retrievedRefund.amount,
    refundRequest.amount,
  );
  TestValidator.equals(
    "retrieved refund currency matches",
    retrievedRefund.currency,
    refundRequest.currency,
  );
  TestValidator.equals(
    "retrieved refund status matches",
    retrievedRefund.status,
    refundRequest.status,
  );
  TestValidator.equals(
    "retrieved refund reason matches",
    retrievedRefund.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "retrieved refund refund method matches",
    retrievedRefund.refund_method,
    refundRequest.refund_method,
  );
  TestValidator.equals(
    "retrieved refund created at matches",
    retrievedRefund.created_at,
    refundRequest.created_at,
  );
  TestValidator.equals(
    "retrieved refund transaction id matches",
    retrievedRefund.transaction_id,
    refundRequest.transaction_id,
  );
}
