import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
import type { IShoppingMallOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnItem";
import type { IShoppingMallReturnAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnAddress";
import type { IShoppingMallReturnShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShippingMethod";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_return_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
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
  // Step 2: Update a return request
  const orderCode = typia.random<string>();
  const returnCode = typia.random<string>();
  // Update the return status from 'pending' to 'processed' with details
  const updatedReturn =
    await api.functional.shoppingMall.admin.orders.returns.update(
      adminConnection,
      {
        orderCode: orderCode,
        returnCode: returnCode,
        body: {
          status: "processed",
          refund_amount: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1> &
              tags.Maximum<999999.99>
          >(),
          processing_notes: RandomGenerator.paragraph({ sentences: 5 }),
          override_reason: "Normal processing according to policy",
        } satisfies IShoppingMallOrderReturn.IUpdate,
      },
    );
  // Validate the response structure using typia.assert
  const validatedReturn = typia.assert<IShoppingMallOrderReturn>(updatedReturn);
  // Step 3: Validate the update
  // Status should be updated to processed
  TestValidator.equals(
    "return status should be updated to processed",
    validatedReturn.status,
    "processed",
  );
  // Refund amount should match
  TestValidator.equals(
    "refund amount should match",
    validatedReturn.refundAmount,
    validatedReturn.refundAmount,
  );
  // requestedAt timestamp should be set
  TestValidator.predicate(
    "requestedAt timestamp should be set",
    () => validatedReturn.requestedAt !== null,
  );
}
