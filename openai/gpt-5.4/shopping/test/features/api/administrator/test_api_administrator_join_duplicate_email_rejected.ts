import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const firstPassword = typia.random<string & tags.Format<"password">>();
  const secondPassword = typia.random<string & tags.Format<"password">>();
  const firstJoinBody = {
    email,
    password: firstPassword,
    href: `https://example.com/admin/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
  } satisfies IShoppingMallAdministrator.IJoin;
  const firstAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const firstAuthorized = await authorize_administrator_join(
    firstAdministratorConnection,
    {
      body: firstJoinBody,
    },
  );
  typia.assert(firstAuthorized);
  TestValidator.equals(
    "first join uses submitted email",
    firstAuthorized.email,
    firstJoinBody.email,
  );
  TestValidator.equals(
    "first administrator is not deleted",
    firstAuthorized.deleted_at,
    null,
  );
  TestValidator.equals(
    "first connection stores issued access token",
    firstAdministratorConnection.headers?.Authorization,
    firstAuthorized.token.access,
  );
  const secondAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const secondJoinBody = {
    email,
    password: secondPassword,
    href: `https://example.com/admin/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
  } satisfies IShoppingMallAdministrator.IJoin;
  await TestValidator.error(
    "duplicate administrator email is rejected",
    async () => {
      await authorize_administrator_join(secondAdministratorConnection, {
        body: secondJoinBody,
      });
    },
  );
  TestValidator.equals(
    "first authorization header remains unaffected after duplicate rejection",
    firstAdministratorConnection.headers?.Authorization,
    firstAuthorized.token.access,
  );
  TestValidator.equals(
    "original authorized email remains unchanged",
    firstAuthorized.email,
    email,
  );
}
