import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_account_moderation_state_visibility(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(admin);
  const sellerId = admin.id;
  const seller = await api.functional.shoppingMall.administrator.sellers.at(
    adminConnection,
    {
      sellerId,
    },
  );
  typia.assert(seller);
  TestValidator.equals(
    "seller id should match requested id",
    seller.id,
    sellerId,
  );
  TestValidator.predicate(
    "seller email should not be empty",
    seller.email.length > 0,
  );
  TestValidator.predicate(
    "approval status should be visible",
    seller.approvalStatus.length > 0,
  );
  TestValidator.predicate(
    "account status should be visible",
    seller.accountStatus.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be visible",
    seller.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be visible",
    seller.updatedAt.length > 0,
  );
}
