import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_list_access_control_for_deleted_accounts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two user accounts: one active and one to simulate as deleted.
  const user1Connection: api.IConnection = { host: connection.host };
  const user1JoinBody: IMultiUserTodoUser.IJoin = {
    email: `active.${RandomGenerator.alphabets(6)}@example.com`,
    password: "password1",
    displayName: `ActiveUser${RandomGenerator.alphabets(4)}`,
    href: `https://example.com/join/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphabets(8)}`,
    ip: null,
  };
  const activeUser = await authorize_user_join(user1Connection, {
    body: user1JoinBody,
  });
  typia.assert(activeUser);
  user1Connection.headers ??= {};
  user1Connection.headers.Authorization = activeUser.token.access;
  const user2Connection: api.IConnection = { host: connection.host };
  const user2JoinBody: IMultiUserTodoUser.IJoin = {
    email: `deleted.${RandomGenerator.alphabets(6)}@example.com`,
    password: "password2",
    displayName: `DeletedUser${RandomGenerator.alphabets(4)}`,
    href: `https://example.com/join/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphabets(8)}`,
    ip: null,
  };
  const deletedUser = await authorize_user_join(user2Connection, {
    body: user2JoinBody,
  });
  typia.assert(deletedUser);
  user2Connection.headers ??= {};
  user2Connection.headers.Authorization = deletedUser.token.access;
  // 2. User1 tries to list deleted accounts with filter accountStatus: "deleted"
  const deletedListByUser1 =
    await api.functional.multiUserTodo.user.users.index(user1Connection, {
      body: {
        accountStatus: "deleted",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "asc",
      } satisfies IMultiUserTodoUser.IRequest,
    });
  typia.assert(deletedListByUser1);
  // Validate that all returned users have a non-null deletedAt
  for (const user of deletedListByUser1.data) {
    if (user.deletedAt === null)
      throw new Error("All users in deleted list must have deletedAt not null");
  }
  // Validate pagination data correctness
  TestValidator.predicate(
    "pagination current page",
    deletedListByUser1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    deletedListByUser1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    deletedListByUser1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    deletedListByUser1.pagination.pages >= 0,
  );
  // 3. User2 tries to list deleted accounts (should at least see self)
  const deletedListByUser2 =
    await api.functional.multiUserTodo.user.users.index(user2Connection, {
      body: {
        accountStatus: "deleted",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoUser.IRequest,
    });
  typia.assert(deletedListByUser2);
  // Confirm user2 is in the deleted list
  const user2InDeletedList = deletedListByUser2.data.some(
    (user) => user.id === deletedUser.id,
  );
  TestValidator.predicate("deleted user should see self", user2InDeletedList);
  // 4. User2 tries to filter user list by user1's email - user2 must NOT see user1 info
  const filteredByUser2 = await api.functional.multiUserTodo.user.users.index(
    user2Connection,
    {
      body: {
        email: user1JoinBody.email,
        accountStatus: "all",
      } satisfies IMultiUserTodoUser.IRequest,
    },
  );
  typia.assert(filteredByUser2);
  const user2SeesUser1 = filteredByUser2.data.some(
    (user) => user.email === user1JoinBody.email,
  );
  TestValidator.predicate(
    "user must NOT see other user's info",
    !user2SeesUser1,
  );
  // 5. Anonymous request without Authorization header must be rejected with 401
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized request without token",
    401,
    async () => {
      await api.functional.multiUserTodo.user.users.index(anonymousConnection, {
        body: {
          accountStatus: "deleted",
        } satisfies IMultiUserTodoUser.IRequest,
      });
    },
  );
}
