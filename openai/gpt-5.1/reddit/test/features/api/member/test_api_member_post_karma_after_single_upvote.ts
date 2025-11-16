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
import type { ICommunityPlatformUserPostKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPostKarmas";

/**
 * Validate that a member user's aggregated post karma reflects a single upvote
 * on one of their posts.
 *
 * Business workflow covered by this test:
 *
 * 1. A new member user self-registers and becomes the eventual post author and
 *    voter.
 * 2. The member user creates a new community using an existing visibility level
 *    code.
 * 3. A platform admin account is registered and used to configure a text post
 *    type.
 * 4. The member user logs back in and creates a text post in the community using
 *    the post type.
 * 5. The same member user casts a single upvote on that post.
 * 6. The test fetches the member user's post karma aggregate and verifies that
 *    post_karma equals 1.
 *
 * This scenario ensures that:
 *
 * - Auth flows for memberUser and platformAdmin work end-to-end for this path.
 * - Community, post type, post, and vote creation endpoints cooperate correctly.
 * - The user-level aggregate in community_platform_user_post_karmas is updated to
 *   reflect the post vote and is readable via GET
 *   /communityPlatform/memberUsers/{memberUserId}/postKarmas.
 */
export async function test_api_member_post_karma_after_single_upvote(
  connection: api.IConnection,
) {
  // 1. Register a new member user (author and voter)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const memberId: string & tags.Format<"uuid"> = memberAuth.id;

  // 2. Create a community as the member user
  const communityIdentifier = `test-community-${RandomGenerator.alphabets(8)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community identifier matches request",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community creator id matches member user id",
    community.creator.id,
    memberId,
  );

  const communityId: string & tags.Format<"uuid"> = community.id;

  // 3. Register a platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://community.example.com/admin/signup",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 4. Create a text-oriented post type as platform admin
  const postTypeCode = `text_${RandomGenerator.alphabets(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  TestValidator.equals(
    "created post type code matches request",
    postType.code,
    postTypeCode,
  );

  const postTypeId: string & tags.Format<"uuid"> = postType.id;

  // 5. Log back in as the member user to ensure the connection uses member auth
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  TestValidator.equals(
    "logged-in member id matches joined member id",
    memberLoginAuth.id,
    memberId,
  );

  // 6. Create a text post in the created community as the member user
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBodyText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const postCreateBody = {
    community_id: communityId,
    post_type_id: postTypeId,
    title: postTitle,
    body: postBodyText,
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id matches created community",
    post.community.id,
    communityId,
  );
  TestValidator.equals(
    "post author id matches member user",
    post.author.id,
    memberId,
  );
  TestValidator.equals(
    "post type id matches created post type",
    post.postType.id,
    postTypeId,
  );

  const postId: string & tags.Format<"uuid"> = post.id;

  // 7. Cast a single upvote on the post as the same member user
  const postVoteCreateBody = {
    community_platform_post_id: postId,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: postVoteCreateBody },
    );
  typia.assert(vote);

  TestValidator.equals("vote is recorded as an upvote (1)", vote.vote_value, 1);
  TestValidator.equals(
    "vote post id matches created post",
    vote.community_platform_post_id,
    postId,
  );

  // 8. Retrieve the member user's post karma aggregate
  const karmas: ICommunityPlatformUserPostKarmas =
    await api.functional.communityPlatform.memberUsers.postKarmas.at(
      connection,
      { memberUserId: memberId },
    );
  typia.assert(karmas);

  TestValidator.equals(
    "karma aggregate member_user_id matches member id",
    karmas.member_user_id,
    memberId,
  );

  TestValidator.equals(
    "post_karma reflects single upvote",
    karmas.post_karma,
    1,
  );

  // Verify created_at and updated_at exist and updated_at is not earlier than created_at
  const createdAt = karmas.created_at;
  const updatedAt = karmas.updated_at;

  const createdAtTime = new Date(createdAt).getTime();
  const updatedAtTime = new Date(updatedAt).getTime();

  TestValidator.predicate(
    "updated_at is greater than or equal to created_at on karma aggregate",
    updatedAtTime >= createdAtTime,
  );
}
