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

export async function test_api_user_email_verifications_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration to obtain authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: `emptyresult_${RandomGenerator.alphabets(6)}@example.com`,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoUser.IJoin,
  });
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call the email_verifications index endpoint with filter that yields no results
  //    Since the schema for filter request is empty, we simulate by passing impossible filter conditions as no body properties
  //    But the IRequest structure has no specified properties, so we pass an empty object.
  const response =
    await api.functional.multiUserTodo.user.email_verifications.index(
      userConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Verify the response has empty data and correct pagination info
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination total pages", response.pagination.pages, 0);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("response data length", response.data.length, 0);
}
