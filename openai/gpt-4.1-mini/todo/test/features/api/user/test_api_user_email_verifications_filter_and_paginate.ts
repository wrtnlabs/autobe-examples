import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verifications_filter_and_paginate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare base user connection by joining
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: `test${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "Password123!",
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoUser.IJoin,
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Authorization check: Using base connection without auth must fail
  await TestValidator.httpError("authorization required", 401, async () => {
    await api.functional.multiUserTodo.user.email_verifications.index(
      connection,
      {
        body: {},
      },
    );
  });
  // 3. Retrieve the list with empty filter
  const response1 =
    await api.functional.multiUserTodo.user.email_verifications.index(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(response1);
  // Validate pagination metadata and data array
  TestValidator.predicate(
    "pagination current should be >= 1",
    response1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    response1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    response1.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(response1.data));
  // 4. Retrieve again to simulate pagination
  // The IRequest has no properties, so no filtering possible by design
  const response2 =
    await api.functional.multiUserTodo.user.email_verifications.index(
      userConnection,
      { body: {} },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "pagination current should be >= 1",
    response2.pagination.current >= 1,
  );
  TestValidator.predicate("data is an array", Array.isArray(response2.data));
}
