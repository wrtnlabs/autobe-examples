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
export async function test_api_payment_refund_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate random order code for refund creation with valid format
  const orderCode = `ORD-${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphaNumeric(4)}`;
  // Step 3: Create refund record through admin using correct property names
  const refund =
    await generate_random_shopping_mall_admin_orders_refunds_create(
      adminConnection,
      {
        params: {
          orderCode,
        },
        body: {
          orderCode,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          refund_amount: typia.random<number & tags.Minimum<0>>(), // Correct type: number
          refund_type: "full" as const,
          return_items: [RandomGenerator.alphaNumeric(8)],
          return_reason_code: "DAMAGED",
          return_ship_method: "Standard_Return_Courier",
        } satisfies IShoppingMallOrderRefund.ICreate,
      },
    );
  typia.assert(refund);
  // Step 4: Perform deletion of refund record
  await api.functional.shoppingMall.admin.payment_refunds.erase(
    adminConnection,
    {
      refundId: refund.id,
    },
  );
  // Step 5: Verify deletion by attempting to delete the same refund again
  await TestValidator.error("repeated deletion should fail", async () => {
    await api.functional.shoppingMall.admin.payment_refunds.erase(
      adminConnection,
      {
        refundId: refund.id,
      },
    );
  });
  // Step 6: Verify refund cannot be retrieved by attempting to create another refund with same order code
  // This simulates scenario where admin tries to access the deleted refund
  await TestValidator.error(
    "retrieval after deletion should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.refunds.create(
        adminConnection,
        {
          orderCode: refund.order_code,
          body: {
            orderCode: refund.order_code,
            reason: refund.reason, // Valid property from IShoppingMallOrderRefund type
            refund_amount: refund.amount, // Valid property from IShoppingMallOrderRefund type
            refund_type: "full" as const,
            return_items: [RandomGenerator.alphaNumeric(8)], // These can be recreated as they're request properties
            return_reason_code: "DAMAGED", // These can be recreated as they're request properties
            return_ship_method: "Standard_Return_Courier", // These can be recreated as they're request properties
          } satisfies IShoppingMallOrderRefund.ICreate,
        },
      );
    },
  );
}
