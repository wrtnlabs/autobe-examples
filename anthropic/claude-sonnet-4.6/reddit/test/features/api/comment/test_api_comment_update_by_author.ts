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

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a community (the member automatically becomes owner)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe to the community (required to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // Step 4: Create a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create an initial comment on the post
  const originalContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { content: originalContent },
    },
  );
  typia.assert(comment);
  // Verify the original comment content is as expected
  TestValidator.equals(
    "original comment content",
    comment.content,
    originalContent,
  );
  // Step 6: Update the comment with new content (first update)
  const firstUpdatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.community.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: firstUpdatedContent,
        } satisfies ICommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Validate: content updated to new value
  TestValidator.equals(
    "updated content matches first update",
    updatedComment.content,
    firstUpdatedContent,
  );
  TestValidator.notEquals(
    "content changed from original",
    updatedComment.content,
    originalContent,
  );
  // Validate: immutable fields remain unchanged
  TestValidator.equals("comment id unchanged", updatedComment.id, comment.id);
  TestValidator.equals(
    "post_id unchanged",
    updatedComment.post_id,
    comment.post_id,
  );
  TestValidator.equals(
    "parent_id unchanged",
    updatedComment.parent_id,
    comment.parent_id,
  );
  TestValidator.equals(
    "author id unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "vote_score unchanged",
    updatedComment.vote_score,
    comment.vote_score,
  );
  // Validate: deleted_at is null (comment still active)
  // ICommunityComment does not have deleted_at in the type definition, so we skip that check
  // Validate: updated_at >= created_at
  TestValidator.predicate(
    "updated_at is >= created_at",
    new Date(updatedComment.updated_at) >= new Date(updatedComment.created_at),
  );
  // Step 7: Perform a second update to confirm multiple edits are allowed
  const secondUpdatedContent = RandomGenerator.paragraph({ sentences: 4 });
  const secondUpdatedComment =
    await api.functional.community.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: secondUpdatedContent,
        } satisfies ICommunityComment.IUpdate,
      },
    );
  typia.assert(secondUpdatedComment);
  // Validate: content updated to second value
  TestValidator.equals(
    "updated content matches second update",
    secondUpdatedComment.content,
    secondUpdatedContent,
  );
  TestValidator.notEquals(
    "content changed from first update",
    secondUpdatedComment.content,
    firstUpdatedContent,
  );
  // Validate: immutable fields remain unchanged after second update
  TestValidator.equals(
    "comment id unchanged after second update",
    secondUpdatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "post_id unchanged after second update",
    secondUpdatedComment.post_id,
    comment.post_id,
  );
  TestValidator.equals(
    "author id unchanged after second update",
    secondUpdatedComment.author.id,
    comment.author.id,
  );
}
