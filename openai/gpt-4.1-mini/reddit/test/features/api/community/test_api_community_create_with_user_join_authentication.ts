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

/**
 * Validate the workflow of user join and subsequent redditCommunity community
 * creation.
 *
 * This test ensures that a new user can successfully join the system,
 * authenticate, and then create a new community with fresh data. It verifies
 * data integrity and business rules throughout the process.
 *
 * Steps:
 *
 * 1. User joins with unique email and connection metadata
 * 2. Assert user authorization and token
 * 3. Create a redditCommunity community with unique name and optional description
 * 4. Assert the created community's data including timestamps
 */
export async function test_api_community_create_with_user_join_authentication(
  connection: api.IConnection,
) {
  // 1. User joins with unique email and connection information
  const email: string = typia.random<string & tags.Format<"email">>();
  const href = `https://example.com/page/${typia.random<string & tags.Format<"uuid">>()}`;
  const referrer = `https://referrer.com/page/${typia.random<string & tags.Format<"uuid">>()}`;

  const joinBody = {
    email,
    password: "password123",
    ip: null,
    href,
    referrer,
  } satisfies IRedditCommunityUser.ICreate;

  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Verify basic properties of the authorized user
  TestValidator.predicate(
    "user id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      user.id,
    ),
  );
  TestValidator.equals("user email matches input", user.email, email);
  TestValidator.predicate(
    "user has access token string",
    typeof user.token.access === "string" && user.token.access.length > 0,
  );

  // 3. Create a new community with unique name and description
  const communityName = `community_${typia.random<string & tags.Pattern<"^[a-zA-Z0-9_]+$">>()}`;
  const communityDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 8,
  });

  const createBody = {
    name: communityName,
    description: communityDescription,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: createBody,
    });
  typia.assert(community);

  // 4. Verify created community properties
  TestValidator.predicate(
    "community id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );

  if (community.description !== null && community.description !== undefined) {
    TestValidator.equals(
      "community description matches input",
      community.description,
      communityDescription,
    );
  } else {
    TestValidator.predicate(
      "community description is null or string",
      community.description === null ||
        typeof community.description === "string",
    );
  }

  TestValidator.predicate(
    "community created_at is ISO date string",
    typeof community.created_at === "string" && community.created_at.length > 0,
  );
  TestValidator.predicate(
    "community updated_at is ISO date string",
    typeof community.updated_at === "string" && community.updated_at.length > 0,
  );
  TestValidator.predicate(
    "community deleted_at is null or string",
    community.deleted_at === null || community.deleted_at === undefined,
  );
}
