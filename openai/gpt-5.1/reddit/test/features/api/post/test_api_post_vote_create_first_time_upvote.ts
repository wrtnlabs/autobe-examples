import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate first-time upvote creation on a post by a member user.
 *
 * Business context: A member user should be able to upvote a post exactly once
 * initially. When the user has never voted on a specific post before, calling
 * POST /communityPlatform/memberUser/postVotes with vote_value = +1 should
 * insert a new vote row tied to the authenticated member, the target post, and
 * the post's community. The response should include correct association
 * summaries and the canonical numeric vote value.
 *
 * Steps implemented in the test:
 *
 * 1. Register a member user (auth.memberUser.join) to act as the voter.
 * 2. Register a platform admin (auth.platformAdmin.join) to create master data
 *    such as community visibility levels and post types.
 * 3. As platformAdmin, create a visibility level using
 *    communityPlatform.platformAdmin.communityVisibilityLevels.create.
 * 4. Switch to the member user and create a community that references the created
 *    visibilityLevel.code via communityPlatform.memberUser.communities.create.
 * 5. Switch back to platformAdmin and create a post type via
 *    communityPlatform.platformAdmin.postTypes.create.
 * 6. Switch to the member user again and create a post in the community using the
 *    created post type via communityPlatform.memberUser.posts.create.
 * 7. As the same member user, create a post vote via
 *    communityPlatform.memberUser.postVotes.create with
 *    community_platform_post_id = post.id and vote_value = 1.
 * 8. Assert that the returned ICommunityPlatformPostVote has:
 *
 *    - Id set (UUID validated by typia.assert),
 *    - Vote_value === 1,
 *    - MemberUser.id equals the authenticated member user's id,
 *    - Post.id equals the created post id,
 *    - Community.id equals the community id of the post.
 */
export async function test_api_post_vote_create_first_time_upvote(
  connection: api.IConnection,
) {
  // 1. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register platform admin (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin (already authenticated by join), create visibility level
  const visibilityCode = RandomGenerator.alphaNumeric(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to member user via login to ensure correct actor for community/post/vote
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: "198.51.100.23",
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 5. As member user, create a community referencing the visibility level code
  const communityCreateBody = {
    identifier: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community creator matches logged-in member",
    community.creator.id,
    memberAfterLogin.id,
  );

  // 6. Switch back to platformAdmin via login to create post type
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: "203.0.113.11",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  const postTypeCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 7. Switch again to member user and create a post within the community
  const memberLoginForPostBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: "198.51.100.24",
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/community",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberForPost: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginForPostBody,
    });
  typia.assert(memberForPost);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
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
    "post community matches created community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post author matches member user",
    post.author.id,
    memberForPost.id,
  );

  // 8. As the same member user, create a first-time upvote
  const postVoteCreateBody = {
    community_platform_post_id: post.id,
    vote_value: 1,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: postVoteCreateBody },
    );
  typia.assert(postVote);

  // 9. Business assertions on the created vote
  TestValidator.equals(
    "vote uses correct post id",
    postVote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote uses correct member user id",
    postVote.community_platform_memberuser_id,
    memberForPost.id,
  );
  TestValidator.equals("vote numeric value is +1", postVote.vote_value, 1);
  TestValidator.equals(
    "vote.memberUser summary id matches voter",
    postVote.memberUser.id,
    memberForPost.id,
  );
  TestValidator.equals(
    "vote.post summary id matches post",
    postVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "vote.community summary id matches community",
    postVote.community.id,
    community.id,
  );
}
