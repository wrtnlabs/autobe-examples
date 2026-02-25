import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_retrieval_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration (join) to obtain authenticated session
  const userConnection: api.IConnection = { host: connection.host };
  // Generate user join body
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/",
  } satisfies IMultiUserTodoUser.IJoin;
  // Call join utility function to register and authenticate user
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Update userConnection with Authorization header from authorized token
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Retrieve profile of authenticated user
  const profile =
    await api.functional.multiUserTodo.user.users.at(userConnection);
  // Assert profile structure
  typia.assert(profile);
  // Verify profile minimum properties
  TestValidator.predicate(
    "profile has id",
    typeof profile.id === "string" && profile.id.length > 0,
  );
  TestValidator.predicate(
    "profile has displayName",
    typeof profile.displayName === "string" && profile.displayName.length > 0,
  );
  // Verify that sensitive info is not present (no email, no password)
  if ((profile as any).email !== undefined) {
    throw new Error("Profile should not include email field");
  }
  if ((profile as any).password !== undefined) {
    throw new Error("Profile should not include password field");
  }
  // Verify the profile id matches authorized user id
  TestValidator.equals(
    "profile id matches authorized user",
    profile.id,
    authorized.id,
  );
  // Verify the displayName matches authorized user displayName
  TestValidator.equals(
    "profile displayName matches authorized user",
    profile.displayName,
    authorized.displayName,
  );
}
