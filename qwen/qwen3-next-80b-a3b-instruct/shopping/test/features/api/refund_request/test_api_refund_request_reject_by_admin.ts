import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_refund_request_reject_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as superadmin to have authority to reject refund requests
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // The adminConnection headers are now updated with the authentication token
  // Step 2: Generate a random refund request ID
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Prepare the rejection data with a valid rejection reason
  // According to IShoppingMallRefundRequest.IUpdate, reason is optional but when provided,
  // it must be between 1-500 characters (MinLength<1> & MaxLength<500>)
  const rejectionData = {
    status: "reject",
    reason: "Item received in good condition" satisfies string &
      tags.MinLength<1> &
      tags.MaxLength<500>,
  } satisfies IShoppingMallRefundRequest.IUpdate;
  // Step 4: Call the admin refund request update endpoint to reject the refund request
  const rejectionResponse: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refund_requests.update(
      adminConnection,
      {
        refundRequestId,
        body: rejectionData,
      },
    );
  // Step 5: Validate the rejection response
  typia.assert(rejectionResponse);
  TestValidator.equals(
    "refund request status should be rejected",
    rejectionResponse.status,
    "rejected",
  );
}
