import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_member_comment_vote_create_upsert_on_comment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (connection will carry admin token)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level master record as platform admin
  const visibilityLevelCreateBody = {
    code: `public-${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type master record as platform admin
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword123!",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as the member user
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Create a post in that community as the member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Create a comment on that post as the member user
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 8. Create an upvote on the comment (vote_value = +1)
  const voteCreateBodyUp = {
    community_platform_comment_id: comment.id,
    vote_value: 1 satisfies number,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const firstVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: voteCreateBodyUp,
      },
    );
  typia.assert(firstVote);

  // 9. Validate initial vote response
  TestValidator.equals(
    "vote_value should be +1 after initial upvote",
    firstVote.vote_value,
    1,
  );
  TestValidator.equals(
    "comment id in vote should match created comment id",
    firstVote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment's post_id in vote summary should match created post id",
    firstVote.comment.post_id,
    post.id,
  );
  TestValidator.equals(
    "memberUser id in vote should match authenticated member id",
    firstVote.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "memberUser username in vote should match authenticated member username",
    firstVote.memberUser.username,
    memberAuthorized.username,
  );
  TestValidator.predicate(
    "created_at timestamp in comment vote should be non-empty",
    firstVote.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp in comment vote should be non-empty",
    firstVote.updated_at.length > 0,
  );

  // 10. Call the same endpoint again with a downvote (-1) to exercise upsert semantics
  const voteCreateBodyDown = {
    community_platform_comment_id: comment.id,
    vote_value: -1 satisfies number,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const secondVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: voteCreateBodyDown,
      },
    );
  typia.assert(secondVote);

  // 11. Validate upsert/update behavior
  TestValidator.equals(
    "upserted vote should keep the same id for the same member and comment",
    secondVote.id,
    firstVote.id,
  );
  TestValidator.equals(
    "vote_value should be -1 after downvote upsert",
    secondVote.vote_value,
    -1,
  );
  TestValidator.equals(
    "comment id in second vote should still match comment id",
    secondVote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "memberUser id in second vote should still match member id",
    secondVote.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.predicate(
    "updated_at of second vote should parse as a valid date",
    () => !Number.isNaN(new Date(secondVote.updated_at).getTime()),
  );
}
