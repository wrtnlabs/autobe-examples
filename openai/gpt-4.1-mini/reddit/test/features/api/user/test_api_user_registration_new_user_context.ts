import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_user_registration_new_user_context(
  connection: api.IConnection,
) {
  // Generate unique email and password for new user
  const email = `user${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);

  // Define registration body with IP null (optional), href and referrer as URIs
  const body = {
    email: email as string & tags.Format<"email">,
    password: password,
    ip: null,
    href: "https://redditcommunity.example.com/signup" as string &
      tags.Format<"uri">,
    referrer: "https://redditcommunity.example.com" as string &
      tags.Format<"uri">,
  } satisfies IRedditCommunityUser.ICreate;

  // Call join API and assert full authorized user response including token
  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body,
    });
  typia.assert(authorizedUser);

  // Validate that token is present with expected structure
  TestValidator.predicate(
    "token access is string",
    typeof authorizedUser.token.access === "string",
  );
  TestValidator.predicate(
    "token refresh is string",
    typeof authorizedUser.token.refresh === "string",
  );
  TestValidator.predicate(
    "token expired_at is valid ISO string",
    typeof authorizedUser.token.expired_at === "string" &&
      new Date(authorizedUser.token.expired_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO string",
    typeof authorizedUser.token.refreshable_until === "string" &&
      new Date(authorizedUser.token.refreshable_until).toString() !==
        "Invalid Date",
  );

  // Validate user properties are matching input email and comply with formats
  TestValidator.equals("user email matches input", authorizedUser.email, email);
  TestValidator.predicate(
    "user id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );

  // Validate created_at and updated_at are valid ISO date strings
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof authorizedUser.created_at === "string" &&
      new Date(authorizedUser.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    typeof authorizedUser.updated_at === "string" &&
      new Date(authorizedUser.updated_at).toString() !== "Invalid Date",
  );
}
