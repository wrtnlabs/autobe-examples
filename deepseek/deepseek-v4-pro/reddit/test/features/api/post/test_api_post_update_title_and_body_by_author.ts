import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that a text post author can update title and body via partial PATCH.
 *
 * Validates the complete post update workflow where the original author
 * modifies an existing text post's title and body fields. The test ensures
 * that only the provided fields are changed while system-managed fields
 * and relational references remain intact.
 *
 * The validation covers: (1) the updated post returns the new title and body
 * values, (2) the updated_at timestamp is strictly after created_at,
 * (3) denormalized fields — vote_score, comment_count, and type — are
 * preserved exactly, and (4) the author and community references are
 * unchanged after the update.
 *
 * 1. Register a new member via authorize_member_join and create an isolated
 *    actor connection.
 * 2. Create a community as the member using the generation utility.
 * 3. Subscribe the member to the community so they can post.
 * 4. Create a text-type post with random title and body content.
 * 5. Issue a PATCH update with a new title and new body.
 * 6. Assert the response is valid and validate all expected outcomes.
 */
export async function test_api_post_update_title_and_body_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create text post
  const originalPost =
    await generate_random_community_hub_communities_posts_create(
      memberConnection,
      {
        body: { type: "text" },
        params: { communityName: community.name },
      },
    );
  typia.assert(originalPost);
  // 5. Update post title and body
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newBody = RandomGenerator.content({ paragraphs: 2 });
  const updatedPost = await api.functional.communityHub.posts.update(
    memberConnection,
    {
      postId: originalPost.id,
      body: {
        title: newTitle,
        body: newBody,
      } satisfies ICommunityHubPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate results
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals("body updated", updatedPost.body, newBody);
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedPost.updated_at) > new Date(originalPost.created_at),
  );
  TestValidator.equals(
    "vote_score unchanged",
    updatedPost.vote_score,
    originalPost.vote_score,
  );
  TestValidator.equals(
    "comment_count unchanged",
    updatedPost.comment_count,
    originalPost.comment_count,
  );
  TestValidator.equals("type unchanged", updatedPost.type, originalPost.type);
  TestValidator.equals(
    "author preserved",
    updatedPost.author.id,
    originalPost.author.id,
  );
  TestValidator.equals(
    "community preserved",
    updatedPost.community.id,
    originalPost.community.id,
  );
}
