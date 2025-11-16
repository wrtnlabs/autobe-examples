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
import type { ICommunityPlatformUserCommentKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCommentKarmas";

export async function test_api_member_comment_karma_after_comment_votes(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also logs them in and sets Authorization)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPwd!234",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a post type for text posts
  const postTypeCreateBody = {
    code: `text_${RandomGenerator.alphabets(6)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 3. Register the primary member user (author of posts/comments)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberPwd!234",
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const authorMemberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 4. Capture initial comment karma for the author (may or may not exist yet)
  const initialKarma: ICommunityPlatformUserCommentKarmas =
    await api.functional.communityPlatform.memberUsers.commentKarmas.at(
      connection,
      {
        memberUserId: authorMemberId,
      },
    );
  typia.assert(initialKarma);

  TestValidator.equals(
    "initial karma member_user_id matches author id",
    initialKarma.member_user_id,
    authorMemberId,
  );

  TestValidator.predicate(
    "initial comment_karma is non-negative",
    initialKarma.comment_karma >= 0,
  );

  // 5. Ensure we are authenticated as the authoring member user when creating community/posts/comments
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  TestValidator.equals(
    "member login id matches join id",
    memberLoginAuthorized.id,
    authorMemberId,
  );

  // 6. Create a community as the member user
  const communityCreateBody = {
    identifier: `test-community-${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 7. Create a post in that community as the member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "created post community id matches community id",
    post.community.id,
    community.id,
  );

  // 8. Create multiple comments on the post as the same member user
  const commentCount = 2;
  const comments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const commentCreateBody = {
      body: RandomGenerator.paragraph({ sentences: 4 }),
      parentCommentId: undefined,
      renderingMode: "markdown" as const,
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
    comments.push(comment);
  }

  TestValidator.equals(
    "number of created comments matches expected count",
    comments.length,
    commentCount,
  );

  // 9. Register a second member user to act as an additional voter
  const voterJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@voter.example.com` as string &
      tags.Format<"email">,
    password: "VoterPwd!234",
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const voterAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: voterJoinBody,
    });
  typia.assert(voterAuthorized);

  const voterLoginBody = {
    identifier: voterJoinBody.email,
    password: voterJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const voterLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: voterLoginBody,
    });
  typia.assert(voterLoginAuthorized);

  // 10. Cast upvotes on each comment as the second member user
  const voteValue: number &
    tags.Type<"int32"> &
    tags.Minimum<-1> &
    tags.Maximum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<-1> &
    tags.Maximum<1>;

  await ArrayUtil.asyncForEach(comments, async (comment) => {
    const voteCreateBody = {
      community_platform_comment_id: comment.id,
      vote_value: voteValue,
    } satisfies ICommunityPlatformCommentVote.ICreate;

    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.commentVotes.create(
        connection,
        {
          body: voteCreateBody,
        },
      );
    typia.assert(vote);

    TestValidator.equals(
      "vote target comment id matches comment id",
      vote.comment.id,
      comment.id,
    );
  });

  const totalAddedKarmaFromVotes = commentCount * 1;

  // 11. Re-fetch comment karma for the author and validate delta
  const finalKarma: ICommunityPlatformUserCommentKarmas =
    await api.functional.communityPlatform.memberUsers.commentKarmas.at(
      connection,
      {
        memberUserId: authorMemberId,
      },
    );
  typia.assert(finalKarma);

  TestValidator.equals(
    "final karma member_user_id matches author id",
    finalKarma.member_user_id,
    authorMemberId,
  );

  TestValidator.predicate(
    "final comment_karma is non-negative",
    finalKarma.comment_karma >= 0,
  );

  const karmaDelta = finalKarma.comment_karma - initialKarma.comment_karma;

  TestValidator.equals(
    "karma delta equals total added karma from votes",
    karmaDelta,
    totalAddedKarmaFromVotes,
  );

  TestValidator.predicate(
    "final updated_at is not earlier than initial created_at",
    new Date(finalKarma.updated_at).getTime() >=
      new Date(initialKarma.created_at).getTime(),
  );
}
