import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that post creation is rejected when a member attempts to post in a community they are not subscribed to.
 *
 * This test verifies the business rule that members must be subscribed to a community
 * before they can create posts in it. It creates two separate member accounts,
 * has one member create a community, and then verifies that the second member
 * cannot post in that community without subscribing first.
 */
export async function test_api_post_creation_rejected_when_not_subscribed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {},
  });
  // 2. Setup: Register and authenticate member B (will attempt unauthorized post)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {},
  });
  // 3. Setup: Member A creates a community (member A is owner and auto-subscribed)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 4. Test: Member B attempts to create a post in member A's community
  // Member B is NOT subscribed to this community, so this should fail
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    postType: "text" as const,
    communityId: community.id,
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditClonePost.ICreate;
  // 5. Validation: Verify that post creation is rejected
  await TestValidator.error(
    "post creation rejected when not subscribed",
    async () => {
      await api.functional.redditClone.member.posts.create(memberBConnection, {
        body: postBody,
      });
    },
  );
}
