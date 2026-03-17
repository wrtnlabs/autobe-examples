import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authorized connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Step 2: Create a new community using the member's connection
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe the member to the community (required to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create a new text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create a top-level comment on the post
  const commentContent = "This is a great post!";
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: commentContent,
        parent_id: null,
      },
    },
  );
  typia.assert(comment);
  // Validations
  TestValidator.equals("post_id matches", comment.post_id, post.id);
  TestValidator.equals(
    "parent_id is null (top-level)",
    comment.parent_id,
    null,
  );
  TestValidator.equals(
    "content matches submitted content",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "author id matches member id",
    comment.author.id,
    member.id,
  );
  TestValidator.predicate(
    "vote_score is 0 for new comment",
    comment.vote_score === 0,
  );
  TestValidator.equals(
    "created_at equals updated_at (never edited)",
    comment.created_at,
    comment.updated_at,
  );
  TestValidator.predicate(
    "content is not blank or whitespace",
    comment.content.trim().length > 0,
  );
}
