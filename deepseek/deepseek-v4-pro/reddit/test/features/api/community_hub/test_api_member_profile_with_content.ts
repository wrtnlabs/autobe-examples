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
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that a member's public profile includes their full content history — posts and comments — correctly populated.
 *
 * Validates that the profile endpoint returns authored posts and comments with correct metadata and chronological ordering. The test registers a new member, creates a community, subscribes to it, publishes a text post, adds a top-level comment, then retrieves the profile.
 *
 * Special attention is given to verifying that both the posts and comments arrays contain the newly created content, that the arrays are sorted by created_at descending, and that the karma score reflects the initial zero value since no voting has occurred.
 *
 * 1. Register a new member via join and authenticate.
 * 2. Create a community owned by the member.
 * 3. Subscribe the member to the community.
 * 4. Create a text post in the community.
 * 5. Add a top-level comment on the post.
 * 6. Retrieve the member's public profile by username.
 * 7. Validate posts array contains the created post.
 * 8. Validate comments array contains the created comment.
 * 9. Validate arrays are ordered by created_at descending.
 * 10. Validate karma score is 0.
 */
export async function test_api_member_profile_with_content(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register a new member
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Retrieve the member's public profile
  const profile = await api.functional.communityHub.members.at(connection, {
    username: joinResult.username,
  });
  typia.assert(profile);
  // 7. Validate posts array contains the created post
  const profilePost = profile.posts.find((p) => p.id === post.id);
  TestValidator.predicate(
    "posts array contains created post",
    profilePost !== undefined,
  );
  if (profilePost !== undefined) {
    TestValidator.equals("matched post title", profilePost.title, post.title);
    TestValidator.equals("matched post type", profilePost.type, post.type);
  }
  // 8. Validate comments array contains the created comment
  const profileComment = profile.comments.find((c) => c.id === comment.id);
  TestValidator.predicate(
    "comments array contains created comment",
    profileComment !== undefined,
  );
  if (profileComment !== undefined) {
    TestValidator.equals(
      "matched comment content",
      profileComment.content,
      comment.content,
    );
    TestValidator.equals(
      "matched comment depth",
      profileComment.depth,
      0 satisfies number as number,
    );
    TestValidator.equals(
      "matched comment vote_score",
      profileComment.vote_score,
      comment.vote_score,
    );
  }
  // 9. Validate arrays ordered by created_at descending
  TestValidator.predicate("posts ordered by created_at descending", () => {
    for (let i = 0; i < profile.posts.length - 1; i++) {
      if (profile.posts[i].created_at < profile.posts[i + 1].created_at)
        return false;
    }
    return true;
  });
  TestValidator.predicate("comments ordered by created_at descending", () => {
    for (let i = 0; i < profile.comments.length - 1; i++) {
      if (profile.comments[i].created_at < profile.comments[i + 1].created_at)
        return false;
    }
    return true;
  });
  // 10. Validate karma score starts at 0
  TestValidator.equals(
    "initial karma score",
    profile.karma,
    0 satisfies number as number,
  );
}
