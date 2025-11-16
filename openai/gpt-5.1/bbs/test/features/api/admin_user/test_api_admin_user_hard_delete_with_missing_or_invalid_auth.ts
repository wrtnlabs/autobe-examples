import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_admin_user_hard_delete_with_missing_or_invalid_auth(
  connection: api.IConnection,
) {
  // 1. Create an admin account (this also authenticates the connection as adminUser).
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(adminAuthorized);

  // Sanity check: connection should now carry an Authorization header for this admin.
  await api.functional.discussionBoard.adminUser.articleCategories.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardArticleCategory.ICreate,
    },
  );

  // 2. Prepare an unauthenticated connection: clone without any headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Perform unauthorized DELETE attempts using the unauthenticated connection.
  // 3-1) First unauthorized attempt (no Authorization header).
  await TestValidator.error(
    "hard delete adminUser without Authorization header must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.erase(
        unauthenticatedConnection,
        {
          adminUserId: adminAuthorized.id,
        },
      );
    },
  );

  // 3-2) Second unauthorized attempt using the same unauthenticated connection.
  await TestValidator.error(
    "repeated hard delete attempt without auth must still fail",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.erase(
        unauthenticatedConnection,
        {
          adminUserId: adminAuthorized.id,
        },
      );
    },
  );

  // 4. Indirectly confirm that the admin account still exists and remains active
  //    by performing another admin-only operation using the authenticated connection.
  const secondCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(10),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(secondCategory);

  TestValidator.predicate(
    "adminUser should still be able to create categories after failed unauthorized deletes",
    !!secondCategory.id,
  );
}
