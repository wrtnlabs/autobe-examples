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

export async function test_api_seller_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstJoin: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(firstSellerConnection, {
      body: {
        email: duplicateEmail,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(firstJoin);
  TestValidator.equals(
    "joined seller email matches request",
    firstJoin.email,
    duplicateEmail,
  );
  TestValidator.equals(
    "first connection authorization matches issued access token",
    firstSellerConnection.headers?.Authorization,
    firstJoin.token.access,
  );
  TestValidator.predicate("seller id exists", firstJoin.id.length > 0);
  TestValidator.predicate(
    "access token is non-empty",
    firstJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    firstJoin.token.refresh.length > 0,
  );
  const secondSellerConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate seller email is rejected",
    [400, 409, 422],
    async () => {
      await authorize_seller_join(secondSellerConnection, {
        body: {
          email: duplicateEmail,
          password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
  TestValidator.equals(
    "duplicate join does not mint authorization header",
    secondSellerConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "original seller session remains intact",
    firstSellerConnection.headers?.Authorization,
    firstJoin.token.access,
  );
}
