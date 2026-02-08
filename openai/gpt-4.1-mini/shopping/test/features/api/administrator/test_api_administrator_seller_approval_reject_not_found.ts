import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerApprovalRejectRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRejectRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_approval_reject_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // We create a blank join object as the schema for IShoppingMallAdministrator.IJoin is empty
  const joinCredentials = {} satisfies IShoppingMallAdministrator.IJoin;
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinCredentials,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Use a random UUID that does not exist for approvalId
  const nonExistentApprovalId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Prepare a rejection reason body (empty as per the provided type)
  const body = {} satisfies IShoppingMallSellerApprovalRejectRequest;
  // Attempt reject and expect HttpError 404 Not Found
  await TestValidator.httpError(
    "reject seller approval with non-existent approvalId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.seller.approvals.reject(
        adminConnection,
        {
          approvalId: nonExistentApprovalId,
          body,
        },
      );
    },
  );
}
