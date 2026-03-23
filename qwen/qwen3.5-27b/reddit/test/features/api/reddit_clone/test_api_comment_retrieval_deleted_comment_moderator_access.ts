import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
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
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test moderator access to comments and verify authorization structure.
 * Note: The scenario requires testing deleted comment access, but the DELETE
 * endpoint for comments is not available in the SDK. This test verifies:
 * 1. Community creation and moderator assignment workflow
 * 2. Comment creation and retrieval functionality
 * 3. Response structure validation for comment data
 * 4. Authorization patterns for different user roles
 */
export async function test_api_comment_retrieval_deleted_comment_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Register and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 4. Add moderator to the community (owner only can do this)
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderatorAuth.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator role assigned correctly",
    moderatorAssignment.role,
    "mod",
  );
  // 5. Create a post in the community as owner
  const post = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post created in correct community",
    post.community.id,
    community.id,
  );
  // 6. Create a comment on the post as owner
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      ownerConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment belongs to correct post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author is owner",
    comment.author.id,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "comment is not deleted (active)",
    comment.deleted_at === null,
  );
  // 7. Retrieve the comment as moderator (simulating moderator access check)
  const retrievedComment = await api.functional.redditClone.comments.at(
    moderatorConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "comment retrieved by moderator matches original",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content preserved",
    retrievedComment.content,
    comment.content,
  );
  // 8. Verify response structure includes all required fields
  TestValidator.predicate(
    "comment has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedComment.id,
    ),
  );
  TestValidator.predicate(
    "comment has author information",
    retrievedComment.author.username !== undefined,
  );
  TestValidator.predicate(
    "comment has post reference",
    retrievedComment.post.title !== undefined,
  );
  TestValidator.predicate(
    "comment has valid score",
    typeof retrievedComment.score === "number",
  );
  TestValidator.predicate(
    "comment has creation timestamp",
    retrievedComment.created_at !== undefined,
  );
  // 9. Test retrieval as a guest (unauthenticated)
  const guestConnection: api.IConnection = { host: connection.host };
  const guestRetrieval = await api.functional.redditClone.comments.at(
    guestConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(guestRetrieval);
  TestValidator.equals(
    "guest can retrieve active comment",
    guestRetrieval.id,
    comment.id,
  );
  // 10. Verify authorization patterns are working
  TestValidator.predicate(
    "owner authentication successful",
    ownerAuth.token.access !== undefined,
  );
  TestValidator.predicate(
    "moderator authentication successful",
    moderatorAuth.token.access !== undefined,
  );
  TestValidator.equals(
    "moderator is assigned to correct community",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment references correct member",
    moderatorAssignment.member.id,
    moderatorAuth.id,
  );
}
