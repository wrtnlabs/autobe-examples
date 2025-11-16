import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Sign up and authenticate user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email,
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const authorizedUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorizedUser);

  // 2. Create registered user account
  const createBody = {
    username: RandomGenerator.name(2).replace(/ /g, "").toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const user =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(user);

  // 3. Login as the created user for update operations
  // Since the join API returns authorized user and sets token, simulate login by re-using join
  await api.functional.auth.registeredUser.join(connection, {
    body: {
      typeName: "IRedditCommunityRegisteredUser.IJoin",
      email: createBody.email,
      password: createBody.password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });

  // 4. Prepare update data
  const updateBody = {
    username: user.username + "_updated",
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IRedditCommunityRegisteredUser.IUpdate;

  // 5. Execute update
  const updatedUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.update(
      connection,
      {
        id: user.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUser);

  // 6. Validate updated fields
  TestValidator.equals(
    "username should be updated",
    updatedUser.username,
    updateBody.username,
  );
  TestValidator.equals(
    "email should be updated",
    updatedUser.email,
    updateBody.email,
  );
  TestValidator.predicate("id should be preserved", updatedUser.id === user.id);
  TestValidator.predicate(
    "created_at should be preserved",
    updatedUser.created_at === user.created_at,
  );
  TestValidator.predicate(
    "registered_at should be preserved",
    updatedUser.registered_at === user.registered_at,
  );
}
