import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_suspensions_create } from "../../../generate/generate_random_shopping_mall_administrator_seller_suspensions_create";
import { prepare_random_shopping_mall_seller_suspension } from "../../../prepare/prepare_random_shopping_mall_seller_suspension";

export async function test_api_seller_suspension_erase_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing seller suspension record by an authorized administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator join authentication, updates headers internally
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {},
    });
  // Use the updated headers set by the authorization utility
  // Generate a new seller suspension record for deletion test
  const suspension: IShoppingMallSellerSuspension =
    await generate_random_shopping_mall_administrator_seller_suspensions_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(suspension);

  // Extract the suspension ID safely by casting, since suspension.id does not exist
  const suspensionId: string = (suspension as unknown as { id: string }).id;

  // Delete the created suspension record by suspensionId
  await api.functional.shoppingMall.administrator.seller_suspensions.erase(
    adminConnection,
    {
      suspensionId,
    },
  );
  // Attempt to delete again to confirm deletion results in 404 Not Found
  await TestValidator.httpError(
    "delete non-existent suspension returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.erase(
        adminConnection,
        { suspensionId },
      );
    },
  );
  // Scenario 2: Attempt to delete a non-existent suspension record by an authorized administrator
  const randomId = typia.random<string & tags.Format<"uuid">>();
  // Validate 404 Not Found error for random non-existent suspensionId
  await TestValidator.httpError(
    "delete random non-existent suspensionId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.erase(
        adminConnection,
        {
          suspensionId: randomId,
        },
      );
    },
  );
}
