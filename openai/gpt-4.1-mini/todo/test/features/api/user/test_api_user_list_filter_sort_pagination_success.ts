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

export async function test_api_user_list_filter_sort_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare two user accounts: user1 and user2, join and get authorized
  const user1JoinBody: IMultiUserTodoUser.IJoin = {
    email: `user1_${RandomGenerator.alphaNumeric(5)}@test.com`,
    password: "password123",
    displayName: "AlphaUser",
    href: "http://localhost/join",
    referrer: "http://localhost/referrer",
  };
  const user2JoinBody: IMultiUserTodoUser.IJoin = {
    email: `user2_${RandomGenerator.alphaNumeric(5)}@test.com`,
    password: "password123",
    displayName: "BetaUser",
    href: "http://localhost/join",
    referrer: "http://localhost/referrer",
  };
  // Use user join utility to create user accounts (and get authorization tokens)
  const user1Authorized = await authorize_user_join(
    { host: connection.host },
    { body: user1JoinBody },
  );
  const user2Authorized = await authorize_user_join(
    { host: connection.host },
    { body: user2JoinBody },
  );
  // Create connections for each user with proper authorization headers
  const user1Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user1Authorized.token.access },
  };
  const user2Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user2Authorized.token.access },
  };
  // Query list with filter by email containing part of user1 email
  const filterEmailSubstring = user1JoinBody.email.slice(0, 10); // To match user1 email
  const filterDisplayNameSubstring = "Alpha"; // To match user1 displayName
  const now = new Date();
  // Filtering active users, page 1, limit 10, sort by email asc
  const filteredByEmail = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        email: filterEmailSubstring,
        accountStatus: "active",
        page: 1,
        limit: 10,
        sortBy: "email",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(filteredByEmail);
  // Validate that result contains user1 but not user2
  const containsUser1_emailFilter = filteredByEmail.data.some(
    (user) => user.email === user1JoinBody.email,
  );
  const containsUser2_emailFilter = filteredByEmail.data.some(
    (user) => user.email === user2JoinBody.email,
  );
  TestValidator.predicate(
    "filtered result contains user1 by email substring",
    containsUser1_emailFilter,
  );
  TestValidator.predicate(
    "filtered result does not contain user2 by email substring",
    !containsUser2_emailFilter,
  );
  // Filtering by displayName substring
  const filteredByDisplayName =
    await api.functional.multiUserTodo.user.users.index(user1Connection, {
      body: {
        displayName: filterDisplayNameSubstring,
        accountStatus: "active",
        page: 1,
        limit: 10,
        sortBy: "displayName",
        sortOrder: "asc",
      },
    });
  typia.assert(filteredByDisplayName);
  const containsUser1_displayFilter = filteredByDisplayName.data.some((user) =>
    user.displayName.includes(filterDisplayNameSubstring),
  );
  const containsUser2_displayFilter = filteredByDisplayName.data.some((user) =>
    user.displayName.includes("Beta"),
  );
  TestValidator.predicate(
    "filtered result contains user1 by displayName substring",
    containsUser1_displayFilter,
  );
  TestValidator.predicate(
    "filtered result does not contain user2 by displayName substring",
    !containsUser2_displayFilter,
  );
  // Filtering by accountStatus "active" should not include deleted users (assuming no deleted in this test)
  const activeUsers = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        accountStatus: "active",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(activeUsers);
  for (const user of activeUsers.data) {
    TestValidator.predicate(
      "active user should have null deletedAt",
      user.deletedAt === null,
    );
  }
  // Pagination test: limit 1 per page, then page 2
  const page1 = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        page: 1,
        limit: 1,
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "pagination page 1 limit 1 count",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination page 1 limit 1 has 1 record",
    page1.data.length === 1,
  );
  const page2 = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        page: 2,
        limit: 1,
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination page 2 limit 1 count",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination page 2 limit 1 has 1 record",
    page2.data.length === 1,
  );
  TestValidator.notEquals(
    "page 1 and page 2 user ids differ",
    page1.data[0].id,
    page2.data[0].id,
  );
  // Sorting tests: asc and desc by email
  const sortedEmailAsc = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "email",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(sortedEmailAsc);
  for (let i = 1; i < sortedEmailAsc.data.length; i++) {
    TestValidator.predicate(
      "email ascending order",
      sortedEmailAsc.data[i - 1].email <= sortedEmailAsc.data[i].email,
    );
  }
  const sortedEmailDesc = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "email",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(sortedEmailDesc);
  for (let i = 1; i < sortedEmailDesc.data.length; i++) {
    TestValidator.predicate(
      "email descending order",
      sortedEmailDesc.data[i - 1].email >= sortedEmailDesc.data[i].email,
    );
  }
  // Sorting tests: asc and desc by displayName
  const sortedDisplayAsc = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "displayName",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(sortedDisplayAsc);
  for (let i = 1; i < sortedDisplayAsc.data.length; i++) {
    TestValidator.predicate(
      "displayName ascending order",
      sortedDisplayAsc.data[i - 1].displayName <=
        sortedDisplayAsc.data[i].displayName,
    );
  }
  const sortedDisplayDesc = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "displayName",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(sortedDisplayDesc);
  for (let i = 1; i < sortedDisplayDesc.data.length; i++) {
    TestValidator.predicate(
      "displayName descending order",
      sortedDisplayDesc.data[i - 1].displayName >=
        sortedDisplayDesc.data[i].displayName,
    );
  }
  // Sorting tests: asc and desc by createdAt
  const sortedCreatedAsc = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(sortedCreatedAsc);
  for (let i = 1; i < sortedCreatedAsc.data.length; i++) {
    TestValidator.predicate(
      "createdAt ascending order",
      sortedCreatedAsc.data[i - 1].createdAt <=
        sortedCreatedAsc.data[i].createdAt,
    );
  }
  const sortedCreatedDesc = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(sortedCreatedDesc);
  for (let i = 1; i < sortedCreatedDesc.data.length; i++) {
    TestValidator.predicate(
      "createdAt descending order",
      sortedCreatedDesc.data[i - 1].createdAt >=
        sortedCreatedDesc.data[i].createdAt,
    );
  }
  // Registration date range filtering
  const regStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days ago
  const regEnd = new Date().toISOString();
  const filteredByRegDate = await api.functional.multiUserTodo.user.users.index(
    user1Connection,
    {
      body: {
        registrationStart: regStart,
        registrationEnd: regEnd,
        accountStatus: "all",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(filteredByRegDate);
  // Every user's createdAt in filtered result falls within registrationStart and registrationEnd
  for (const user of filteredByRegDate.data) {
    TestValidator.predicate(
      "createdAt within registration date range",
      user.createdAt >= regStart && user.createdAt <= regEnd,
    );
  }
  // Validate unauthorized access - unauthenticated connection
  await TestValidator.httpError(
    "unauth user access forbidden",
    401,
    async () => {
      await api.functional.multiUserTodo.user.users.index(
        { host: connection.host },
        { body: {} },
      );
    },
  );
}
