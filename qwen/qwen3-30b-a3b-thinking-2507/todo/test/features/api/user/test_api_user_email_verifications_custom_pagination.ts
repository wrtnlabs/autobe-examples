import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserEmailVerification";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_user_email_verifications_create } from "../../../generate/generate_random_todo_user_email_verifications_create";
import { prepare_random_todo_user_email_verification } from "../../../prepare/prepare_random_todo_user_email_verification";

export async function test_api_user_email_verifications_custom_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<ITodoUser.IJoin>(),
  });
  // 2. Create 10 email verification tokens
  const tokenCount = 10;
  const tokens = await ArrayUtil.asyncRepeat(tokenCount, async () => {
    return await generate_random_todo_user_email_verifications_create(
      userConnection,
      {},
    );
  });
  // 3. Retrieve the second page with page=2, pageSize=5
  const page = 2;
  const pageSize = 5;
  const response = await api.functional.todo.user.email_verifications.index(
    userConnection,
    {
      body: {
        page,
        pageSize,
      } satisfies ITodoUserEmailVerification.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response
  TestValidator.equals("current page", response.pagination.current, page);
  TestValidator.equals("page size", response.pagination.limit, pageSize);
  TestValidator.equals("items count", response.data.length, pageSize);
  TestValidator.equals(
    "total records",
    response.pagination.records,
    tokenCount,
  );
  TestValidator.equals(
    "total pages",
    response.pagination.pages,
    Math.ceil(tokenCount / pageSize),
  );
}
