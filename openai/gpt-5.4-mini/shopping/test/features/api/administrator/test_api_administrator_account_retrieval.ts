import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(registered);
  const retrieved =
    await api.functional.mallPlatform.administrator.administrators.at(
      administratorConnection,
      {
        administratorId: registered.id,
      },
    );
  typia.assertEquals<IMallPlatformAdministrator>(retrieved);
  TestValidator.equals(
    "administrator id should match",
    retrieved.id,
    registered.id,
  );
  TestValidator.equals(
    "administrator email should match",
    retrieved.email,
    registered.email,
  );
  TestValidator.equals(
    "administrator grade should match",
    retrieved.grade,
    registered.grade,
  );
  TestValidator.equals(
    "administrator status should match",
    retrieved.status,
    registered.status,
  );
  TestValidator.equals(
    "administrator createdAt should match",
    retrieved.createdAt,
    registered.createdAt,
  );
  TestValidator.equals(
    "administrator updatedAt should match",
    retrieved.updatedAt,
    registered.updatedAt,
  );
  TestValidator.equals(
    "administrator deletedAt should match",
    retrieved.deletedAt,
    registered.deletedAt,
  );
}
