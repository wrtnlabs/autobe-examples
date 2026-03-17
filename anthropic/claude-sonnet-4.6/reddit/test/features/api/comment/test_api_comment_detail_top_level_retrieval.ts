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

export async function test_api_comment_detail_top_level_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
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
  // 5. Create a top-level comment on the post (no parent_id)
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
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
  // 6. Retrieve the comment using a guest connection (no auth token) to verify public access
  const guestConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.community.posts.comments.at(
    guestConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(retrieved);
  // 7. Validate all fields
  TestValidator.equals("comment id matches", retrieved.id, comment.id);
  TestValidator.equals("post_id matches", retrieved.post_id, post.id);
  TestValidator.equals(
    "parent_id is null (top-level)",
    retrieved.parent_id,
    null,
  );
  TestValidator.equals("content matches", retrieved.content, commentContent);
  TestValidator.equals(
    "author id matches member",
    retrieved.author.id,
    member.id,
  );
  TestValidator.predicate(
    "author username is non-empty",
    retrieved.author.username.length > 0,
  );
  TestValidator.equals("vote_score is 0", retrieved.vote_score, 0);
  TestValidator.equals(
    "created_at equals updated_at (never edited)",
    retrieved.created_at,
    retrieved.updated_at,
  );
}
