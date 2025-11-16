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

/**
 * Verify that a member user cannot erase another member user's comment vote.
 *
 * Business context: A comment vote (ICommunityPlatformCommentVote) is owned by
 * the member user who cast it. The DELETE
 * /communityPlatform/memberUser/commentVotes/{commentVoteId} endpoint is
 * documented to require that the authenticated member user is the owner of the
 * vote. This test ensures that when a second member user attempts to delete a
 * vote created by the first member user, the operation fails.
 *
 * High-level flow implemented using available SDK functions:
 *
 * 1. Create and authenticate a platform admin (join).
 * 2. As platform admin, create a community visibility level.
 * 3. As platform admin, create a post type.
 * 4. Create and authenticate member user A (join).
 * 5. As member user A, create a community that uses the created visibility level.
 * 6. As member user A, create a post in that community with the created post type.
 * 7. As member user A, create a comment on that post.
 * 8. As member user A, create a comment vote on that comment and capture its id.
 * 9. Create and authenticate member user B (join).
 * 10. As member user B, attempt to erase the vote owned by A using DELETE
 *     /communityPlatform/memberUser/commentVotes/{commentVoteId}.
 * 11. Assert that the erase attempt as user B fails (an error is thrown).
 *
 * Due to limited read endpoints for comment votes, we cannot directly re-fetch
 * the vote to confirm that it still exists. Instead, this test focuses on the
 * core authorization rule: user B must not be able to successfully call the
 * erase endpoint against a vote created under user A's session. Any error
 * observed from the erase call is treated as enforcement of that rule.
 */
export async function test_api_comment_vote_erase_unauthorized_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a platform admin (join)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As platform admin, create a community visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As platform admin, create a post type
  const postTypeCode = `text-${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Create and authenticate member user A (join)
  const memberAEmail = `${RandomGenerator.alphabets(10)}@member.example.com`;
  const memberAPassword = RandomGenerator.alphabets(16);

  const memberAJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberAEmail as string & tags.Format<"email">,
    password: memberAPassword,
    ip: "192.0.2.10",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // 5. As member user A, create a community using the visibility level
  const communityIdentifier = `community_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 6. As member user A, create a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. As member user A, create a comment on that post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 8. As member user A, create a comment vote on that comment and capture id
  const commentVoteCreateBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const voteOwnedByA: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: commentVoteCreateBody,
      },
    );
  typia.assert(voteOwnedByA);

  // 9. Create and authenticate member user B (join)
  const memberBEmail = `${RandomGenerator.alphabets(10)}@member.example.com`;
  const memberBPassword = RandomGenerator.alphabets(16);

  const memberBJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberBEmail as string & tags.Format<"email">,
    password: memberBPassword,
    ip: "192.0.2.20",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  // 10. As member user B, attempt to erase the vote owned by A.
  // We expect this to fail because B is not the owner of the vote.
  await TestValidator.error(
    "member user B cannot erase comment vote owned by member user A",
    async () => {
      await api.functional.communityPlatform.memberUser.commentVotes.erase(
        connection,
        {
          commentVoteId: voteOwnedByA.id,
        },
      );
    },
  );
}
