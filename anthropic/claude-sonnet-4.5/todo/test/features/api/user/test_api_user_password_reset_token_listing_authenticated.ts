import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordResetToken";
import type { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate retrieval of a user's password reset tokens with standard and
 * filtered queries.
 *
 * 1. Register new user (with Join endpoint) for authentication context.
 * 2. Authenticate user by joining; obtain session token in response.
 * 3. List the password reset tokens for the user (initially expecting zero
 *    tokens).
 * 4. Request with expiration and used filters (should be empty until tokens
 *    exist).
 * 5. Validate pagination/meta correctness and user linkage.
 */
export async function test_api_user_password_reset_token_listing_authenticated(
  connection: api.IConnection,
) {
  // 1. Register new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
    ip: undefined,
  } satisfies ITodoListUser.IJoin;
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(userAuth);

  // 2. Retrieve tokens directly after join (should be empty, no tokens yet)
  const tokenList1: IPageITodoListPasswordResetToken.ISummary =
    await api.functional.todoList.user.users.passwordResetTokens.index(
      connection,
      {
        userId: userAuth.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(tokenList1);
  TestValidator.equals(
    "should return an array",
    Array.isArray(tokenList1.data),
    true,
  );
  TestValidator.equals(
    "should be empty at first (no tokens)",
    tokenList1.data.length,
    0,
  );

  // 3. Check expired/used filters (should still be empty)
  const tokenList2: IPageITodoListPasswordResetToken.ISummary =
    await api.functional.todoList.user.users.passwordResetTokens.index(
      connection,
      {
        userId: userAuth.id,
        body: {
          expired: true,
          used: true,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(tokenList2);
  TestValidator.equals(
    "should still be empty with filters",
    tokenList2.data.length,
    0,
  );

  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination has proper structure",
    typeof tokenList1.pagination.current === "number" &&
      typeof tokenList1.pagination.limit === "number" &&
      typeof tokenList1.pagination.records === "number" &&
      typeof tokenList1.pagination.pages === "number",
  );

  // 5. Try sorting options (should not fail, just no records)
  const sortFields = ["created_at", "expires_at", "used_at"] as const;
  for (const sortField of sortFields) {
    for (const sortDir of ["asc", "desc"] as const) {
      const tokenList: IPageITodoListPasswordResetToken.ISummary =
        await api.functional.todoList.user.users.passwordResetTokens.index(
          connection,
          {
            userId: userAuth.id,
            body: {
              sort_by: sortField,
              sort_dir: sortDir,
              page: 1,
              limit: 5,
            },
          },
        );
      typia.assert(tokenList);
      TestValidator.equals(
        `empty list with sort ${sortField} ${sortDir}`,
        tokenList.data.length,
        0,
      );
    }
  }
}
