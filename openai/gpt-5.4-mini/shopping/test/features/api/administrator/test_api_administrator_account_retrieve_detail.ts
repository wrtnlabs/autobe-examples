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

export async function test_api_administrator_account_retrieve_detail(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const retrieved =
    await api.functional.mallPlatform.administrator.administrators.at(
      administratorConnection,
      {
        administratorId: joined.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "administrator id should match",
    retrieved.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator email should match",
    retrieved.email,
    joined.email,
  );
  TestValidator.equals(
    "administrator grade should match",
    retrieved.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator status should match",
    retrieved.status,
    joined.status,
  );
  TestValidator.equals(
    "administrator created_at should match",
    retrieved.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "administrator updated_at should match",
    retrieved.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "administrator deleted_at should match",
    retrieved.deleted_at,
    joined.deleted_at,
  );
}
