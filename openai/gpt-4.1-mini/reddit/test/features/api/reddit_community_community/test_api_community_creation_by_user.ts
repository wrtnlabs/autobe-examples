import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_community_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User joins (registers) with email, password, href, referrer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://redditcommunity.example.com/user/signup";
  const referrer = "https://redditcommunity.example.com/";

  const joinedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        ip: null, // Optional, explicitly null
        href: href satisfies string & tags.Format<"uri">,
        referrer: referrer satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(joinedUser);

  // 2. User logs in with same credentials
  const loggedInUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        ip: null,
        href: href satisfies string & tags.Format<"uri">,
        referrer: referrer satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(loggedInUser);

  // 3. Create a unique community name - lowercase, no spaces, between 3 and 21 chars
  // Generate name by picking a random name and converting to lowercase and replacing spaces
  const communityNameBase = RandomGenerator.name()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  // Ensure length between 3 and 21 characters, truncate if needed
  const communityName =
    communityNameBase.length >= 3
      ? communityNameBase.slice(0, 21)
      : communityNameBase.padEnd(3, "a");

  // 4. Community description as a paragraph 1 sentence, 10-20 words, 4-8 chars
  const communityDescription = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });

  // 5. Call community creation API
  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(createdCommunity);

  // 6. Validate response fields
  TestValidator.equals(
    "community name matches requested",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches requested",
    createdCommunity.description,
    communityDescription,
  );
  TestValidator.predicate(
    "community id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdCommunity.id,
    ),
  );
  TestValidator.equals(
    "community deleted_at is null",
    createdCommunity.deleted_at ?? null,
    null,
  );
}
