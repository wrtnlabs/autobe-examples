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
 * Verify idempotent behavior of same-direction post vote creation.
 *
 * Business purpose: When a member user upvotes the same post multiple times
 * using POST /communityPlatform/memberUser/postVotes with the same
 * community_platform_post_id and vote_value = +1, the backend must not create
 * duplicate vote rows. Instead it should upsert into
 * community_platform_post_votes, reusing the existing row and only refreshing
 * updated_at while preserving id and created_at.
 *
 * This test executes a full workflow:
 *
 * 1. Register and authenticate a member user (actor: memberUser).
 * 2. Register and authenticate a platform admin (actor: platformAdmin) to perform
 *    master data setup and optional inspection.
 * 3. As platformAdmin, create a community visibility level master row.
 * 4. As memberUser, create a community using that visibility level.
 * 5. As platformAdmin, create a post type master row.
 * 6. As memberUser, create a post in the community with that post type.
 * 7. As memberUser, cast an upvote on the post via POST
 *    /communityPlatform/memberUser/postVotes.
 * 8. As the same memberUser, send the same upvote again.
 * 9. Assert both responses share the same id, member and post ids, and vote_value,
 *    while updated_at is refreshed and created_at is stable.
 * 10. Optionally, as platformAdmin, fetch the vote by id via GET
 *     /communityPlatform/platformAdmin/postVotes/{postVoteId} and verify
 *     consistency with the second response.
 */
export async function test_api_post_vote_create_idempotent_same_direction(
  connection: api.IConnection,
) {
  // 1. Register member user (join) and get authorized envelope.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuth);

  // 2. Register platform admin (join) and get authorized envelope.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const adminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuth);

  // 3. As platformAdmin, create a visibility level used by the community.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Switch to member user context (login) and create a community.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuth);

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Idempotent Voting Test Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. Switch back to platformAdmin and create a post type.
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "203.0.113.20",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const adminLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLoginAuth);

  const postTypeCode = `text-${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post Type",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;
  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 6. Switch again to member user and create a post in that community.
  const memberLoginAuth2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuth2);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Idempotent Upvote Target Post",
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 7. First upvote as member user.
  const firstVoteBody = {
    community_platform_post_id: post.id,
    vote_value: 1,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const firstVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: firstVoteBody },
    );
  typia.assert<ICommunityPlatformPostVote>(firstVote);

  // 8. Second upvote with the same payload (idempotent same-direction vote).
  const secondVoteBody = firstVoteBody;
  const secondVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: secondVoteBody },
    );
  typia.assert<ICommunityPlatformPostVote>(secondVote);

  // 9. Assert idempotent behavior on core fields.
  TestValidator.equals(
    "vote id should remain the same on repeated same-direction vote",
    secondVote.id,
    firstVote.id,
  );
  TestValidator.equals(
    "member user id should remain the same",
    secondVote.community_platform_memberuser_id,
    firstVote.community_platform_memberuser_id,
  );
  TestValidator.equals(
    "post id should remain the same",
    secondVote.community_platform_post_id,
    firstVote.community_platform_post_id,
  );
  TestValidator.equals(
    "vote value should remain +1",
    secondVote.vote_value,
    firstVote.vote_value,
  );
  TestValidator.equals(
    "created_at should remain stable between first and second vote",
    secondVote.created_at,
    firstVote.created_at,
  );

  // updated_at should be >= (or realistically >) the first updated_at.
  TestValidator.predicate(
    "updated_at of second vote should be greater than or equal to first updated_at",
    new Date(secondVote.updated_at).getTime() >=
      new Date(firstVote.updated_at).getTime(),
  );

  // 10. Optionally fetch via platformAdmin to confirm consistency.
  const adminLoginAuth2: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLoginAuth2);

  const adminViewVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.platformAdmin.postVotes.at(
      connection,
      { postVoteId: secondVote.id },
    );
  typia.assert<ICommunityPlatformPostVote>(adminViewVote);

  TestValidator.equals(
    "admin view vote id should match second vote id",
    adminViewVote.id,
    secondVote.id,
  );
  TestValidator.equals(
    "admin view vote value should match second vote value",
    adminViewVote.vote_value,
    secondVote.vote_value,
  );
  TestValidator.equals(
    "admin view post id should match second vote post id",
    adminViewVote.community_platform_post_id,
    secondVote.community_platform_post_id,
  );
  TestValidator.equals(
    "admin view member user id should match second vote member user id",
    adminViewVote.community_platform_memberuser_id,
    secondVote.community_platform_memberuser_id,
  );
}
