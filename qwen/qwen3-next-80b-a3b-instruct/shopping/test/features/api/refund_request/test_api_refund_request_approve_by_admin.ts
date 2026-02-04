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
export async function test_api_refund_request_approve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminJoinInput = {
    email: superAdminEmail,
    password: superAdminPassword,
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: superAdminJoinInput,
  });
  typia.assert(adminAuth);
  // Step 2: Generate a valid refund request ID (UUID)
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Approve refund request as admin
  const approveRequest: IShoppingMallRefundRequest.IUpdate = {
    status: "approve",
    reason: undefined,
  };
  const response =
    await api.functional.shoppingMall.admin.refund_requests.update(
      adminConnection,
      {
        refundRequestId,
        body: approveRequest,
      },
    );
  // Step 4: Validate response
  typia.assert(response);
  TestValidator.equals(
    "refund status should be approved",
    response.status,
    "approved",
  );
  TestValidator.predicate(
    "response message should exist",
    response.message.length > 0,
  );
}