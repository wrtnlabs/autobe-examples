import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that post creation is rejected when a member is banned from the target community.
 *
 * This test verifies that the system enforces ban restrictions by preventing
 * banned members from creating posts in communities where they have been banned.
 * The test follows the natural flow: register two members, create a community,
 * subscribe the second member, ban them, and attempt post creation.
 */
export async function test_api_post_creation_rejected_when_banned_from_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Register and authenticate member B (who will be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 4. Member B subscribes to the community (implicit via post creation attempt,
  //    but we need to ensure they can access it before ban)
  // Note: Subscription is typically automatic when creating posts, but for clarity
  // we'll proceed directly to ban since the test focuses on ban enforcement
  // 5. Member A (as owner) bans member B from the community
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    memberAConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: memberB.id,
        reason: "Test ban for E2E validation",
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban);
  // Verify the ban was created
  TestValidator.equals("ban member matches", ban.member.id, memberB.id);
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.predicate("ban is active", ban.lifted_at === null);
  // 6. Member B attempts to create a post in the banned community
  // This should fail with HTTP 403 Forbidden
  await TestValidator.httpError(
    "post creation rejected for banned member",
    403,
    async () => {
      await generate_random_reddit_clone_member_posts_create(
        memberBConnection,
        {
          body: {
            title: "Banned User Post Attempt",
            postType: "text",
            communityId: community.id,
            content: "This should fail because I'm banned.",
          } satisfies IRedditClonePost.ICreate,
        },
      );
    },
  );
}
