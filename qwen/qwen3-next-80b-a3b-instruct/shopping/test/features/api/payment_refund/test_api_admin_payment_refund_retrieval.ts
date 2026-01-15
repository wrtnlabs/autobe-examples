import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_payment_refund_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Generate a random refund ID and retrieve it with admin access (simulate mode creates data)
  const refundId = typia.random<string & tags.Format<"uuid">>();
  const refund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payment_refunds.at(
      adminConnection,
      {
        refundId,
      },
    );
  typia.assert(refund);
  // Step 3: Validate that admin can retrieve the refund successfully
  TestValidator.equals("refund ID matches", refund.id, refundId);
  // Step 4: Create unauthenticated connection and attempt to access the same refund
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user should not retrieve refund",
    async () => {
      await api.functional.shoppingMall.admin.payment_refunds.at(
        guestConnection,
        {
          refundId,
        },
      );
    },
  );
}
