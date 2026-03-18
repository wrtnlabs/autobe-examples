import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_session_ownership_check(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A1!",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "B1!",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: sellerABody,
  });
  typia.assert(sellerA);
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: sellerBBody,
  });
  typia.assert(sellerB);
  const refreshedA = await authorize_seller_refresh(sellerAConnection, {
    body: {
      refresh_token: sellerA.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedA);
  TestValidator.equals(
    "seller A refresh should preserve owner id",
    refreshedA.id,
    sellerA.id,
  );
  TestValidator.equals(
    "seller A refresh should preserve owner email",
    refreshedA.email,
    sellerA.email,
  );
  TestValidator.equals(
    "seller A refresh should preserve approval status",
    refreshedA.approvalStatus,
    sellerA.approvalStatus,
  );
  const refreshedB = await authorize_seller_refresh(sellerBConnection, {
    body: {
      refresh_token: sellerB.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedB);
  TestValidator.equals(
    "seller B refresh should preserve owner id",
    refreshedB.id,
    sellerB.id,
  );
  TestValidator.equals(
    "seller B refresh should preserve owner email",
    refreshedB.email,
    sellerB.email,
  );
  TestValidator.equals(
    "seller B refresh should preserve approval status",
    refreshedB.approvalStatus,
    sellerB.approvalStatus,
  );
  await TestValidator.error(
    "cross-session seller refresh should fail",
    async () => {
      await authorize_seller_refresh(sellerAConnection, {
        body: {
          refresh_token: sellerB.token.refresh,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
