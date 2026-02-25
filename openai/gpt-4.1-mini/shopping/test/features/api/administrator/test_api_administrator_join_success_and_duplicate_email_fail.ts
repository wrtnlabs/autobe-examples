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

export async function test_api_administrator_join_success_and_duplicate_email_fail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a unique administrator registration request
  const joinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // 2. Perform successful join using utility function authorize_administrator_join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  // 3. Validate the response structure and important fields
  typia.assert(authorized);
  TestValidator.equals("email matches", authorized.email, joinBody.email);
  TestValidator.predicate(
    "has token access",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has token refresh",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "isSuperAdmin is boolean",
    typeof authorized.isSuperAdmin === "boolean",
  );
  TestValidator.equals("deletedAt is null", authorized.deletedAt, null);
  // 4. Try to join again with the same email to test duplicate email failure
  await TestValidator.error("duplicate email registration fails", async () => {
    const secondConnection: api.IConnection = { host: connection.host };
    await authorize_administrator_join(secondConnection, {
      body: {
        email: joinBody.email,
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  });
}
