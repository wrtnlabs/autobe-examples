import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_retrieval_complete(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user with complete profile information
  const authorized: IDiscussionBoardUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: "TestUser123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  // Retrieve the user's public profile
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.users.at(userConnection, {
      userId: authorized.id,
    });
  typia.assert(profile);
  // Verify profile fields match expected values
  TestValidator.equals("id matches created user", profile.id, authorized.id);
  TestValidator.equals(
    "displayName matches",
    profile.displayName,
    "TestUser123",
  );
  TestValidator.predicate("memberSince is valid ISO datetime", () => {
    const date = new Date(profile.memberSince);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "articleCount is 0 for new user",
    profile.articleCount,
    0,
  );
  TestValidator.equals(
    "commentCount is 0 for new user",
    profile.commentCount,
    0,
  );
}
