import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_approval_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that updating a seller approval without administrator authentication
  // is forbidden by the API (403 error). It attempts the update using the base connection
  // without setting authorization headers and expects an HttpError with status 403.
  const sellerApprovalId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IShoppingMallSellerApproval.IUpdate = {
    status: "approved",
    rejectionReason: null,
  };
  await TestValidator.httpError(
    "unauthorized update attempt should throw 403",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.sellerApprovals.update(
        connection,
        {
          sellerApprovalId,
          body: updateBody,
        },
      );
    },
  );
}
