import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_approval_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion of a non-existent seller approval record by an authorized administrator.
  // 1. Administrator registers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Set authorization header after join internally done by authorize_administrator_join function
  // 2. Attempt to delete a non-existent seller approval record
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Because the eraseSellerApproval function returns void on success,
  // an error is expected here because the ID does not exist (404)
  await TestValidator.httpError(
    "delete non-existent seller approval should fail with 404",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.sellerApprovals.eraseSellerApproval(
        adminConnection,
        { sellerApprovalId: nonExistentId },
      ),
  );
}
