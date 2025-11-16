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
 * Validate that an admin-only comment vote detail lookup returns an error when
 * requesting a non-existent vote ID, using a realistic multi-actor setup flow.
 *
 * Business flow:
 *
 * 1. Register a new platform admin (platformAdmin.join) to obtain an admin context
 *    for configuration operations.
 * 2. As platform admin, create a community visibility level and a post type to
 *    support realistic community/post creation.
 * 3. Register and login a member user (memberUser.join/login) as the actor who
 *    will create community content and cast a real comment vote.
 * 4. As the member user, create a community, then a post in that community, then a
 *    comment on the post, and finally a comment vote for that comment.
 * 5. Switch back to the platform admin actor via platformAdmin.login so that the
 *    admin-only GET /communityPlatform/platformAdmin/
 *    commentVotes/{commentVoteId} endpoint can be called.
 * 6. Generate a random UUID that is explicitly different from the real vote id
 *    captured in step 4, and call the admin detail endpoint with this
 *    non-existent ID.
 * 7. Assert using TestValidator.error that the call fails (e.g. not-found style
 *    error), without inspecting specific HTTP status codes or error body
 *    details, satisfying the negative-path behavior.
 */
export async function test_api_comment_vote_detail_not_found_for_random_id(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain initial admin auth context
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityLevelCreateBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type as platform admin
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphabets(6)}`,
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

  // 4. Register and login as a member user (actor switching)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: undefined,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedJoin);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: undefined,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  // 5. As member user, create a community
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 6. As member user, create a post in the community
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

  // 7. As member user, create a comment on the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
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

  // 8. As member user, create a real comment vote (for environment realism)
  const commentVoteCreateBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const realVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: commentVoteCreateBody,
      },
    );
  typia.assert(realVote);

  // 9. Switch back to platform admin by logging in again (actor switching)
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: undefined,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 10. Generate a random UUID that is very unlikely to equal the real vote id
  let randomCommentVoteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (randomCommentVoteId === realVote.id) {
    randomCommentVoteId = typia.random<string & tags.Format<"uuid">>();
  }

  // Sanity check that our generated ID is different from the real one
  TestValidator.notEquals(
    "random comment vote id must differ from real vote id",
    randomCommentVoteId,
    realVote.id,
  );

  // 11. Call the admin-only detail endpoint with the non-existent vote ID
  await TestValidator.error(
    "non-existent comment vote should result in error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.commentVotes.at(
        connection,
        {
          commentVoteId: randomCommentVoteId,
        },
      );
    },
  );
}
