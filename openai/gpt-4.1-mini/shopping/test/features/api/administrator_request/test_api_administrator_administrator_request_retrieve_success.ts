import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_request_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as administrator by login (not join)
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "strongpassword";
  // First register the administrator for login
  const authorized = await authorize_administrator_join(adminConnection, {
    body: { email, password },
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Since no creation API for administrator request exists, we test retrieval using the random valid UUID
  const administratorRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the administrator request details
  let response: IShoppingMallAdministratorRequest | undefined = undefined;
  try {
    response =
      await api.functional.shoppingMall.administrator.administratorRequests.at(
        adminConnection,
        {
          administratorRequestId,
        },
      );
  } catch (exp) {
    // If error, fail test because scenario expects to find existing request
    throw exp;
  }
  typia.assert(response);
  // 4. Validate fields of the response
  TestValidator.equals(
    "administratorRequestId matches",
    response.id,
    administratorRequestId,
  );
  TestValidator.predicate(
    "actorType non-empty string",
    response.actorType.length > 0,
  );
  TestValidator.predicate(
    "reason non-empty string",
    response.reason.length > 0,
  );
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected"].includes(response.status),
  );
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/.test(
      response.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/.test(
      response.updatedAt,
    ),
  );
  if (response.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is ISO date-time or null",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/.test(
        response.deletedAt!,
      ),
    );
  }
}
