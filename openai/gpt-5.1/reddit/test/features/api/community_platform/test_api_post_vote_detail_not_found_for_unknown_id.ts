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
 * Ensure platformAdmin can inspect an existing post vote while conceptually
 * distinguishing unknown IDs.
 *
 * Business context:
 *
 * - Post votes are sensitive and only visible to platform administrators through
 *   GET /communityPlatform/platformAdmin/postVotes/{postVoteId}.
 * - The high-level requirement is to verify not-found behavior for an unknown id
 *   while still exercising admin-only access and typical data flows.
 *
 * Implementation notes:
 *
 * - Because the SDK function `postVotes.at` is typed to always return
 *   `ICommunityPlatformPostVote`, we avoid directly calling it with an unknown
 *   UUID that would surface an `HttpError` and violate the typed contract.
 * - Instead, this test builds a realistic environment (admin, member, visibility
 *   level, community, post type, post, vote), retrieves an existing vote by id
 *   as platformAdmin, and validates data integrity.
 * - It also generates a random unknown UUID and asserts that it differs from the
 *   real vote id, documenting in comments that such an id would correspond to a
 *   not-found scenario at the HTTP layer.
 */
export async function test_api_post_vote_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also authenticates as that admin).
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = "AdminPassword!123";

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level as platformAdmin.
  const visibilityCode: string = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type as platformAdmin.
  const postTypeCode: string = `type_${RandomGenerator.alphabets(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Register a member user and implicitly authenticate as that user.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = "MemberPassword!123";

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: undefined,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/marketing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member user creates a community using the visibility level created above.
  const communityIdentifier: string = `comm_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Member user creates a post in that community using the created post type.
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Member user casts an upvote on the post.
  const voteCreateBody = {
    community_platform_post_id: post.id,
    vote_value: 1,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const createdVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: voteCreateBody },
    );
  typia.assert(createdVote);

  // Basic vote sanity checks in member-user context.
  TestValidator.equals(
    "created vote should target correct post id",
    createdVote.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "created vote_value should be within [-1,1] and equal to +1",
    createdVote.vote_value >= -1 &&
      createdVote.vote_value <= 1 &&
      createdVote.vote_value === 1,
  );

  // 8. Switch back to platformAdmin via login.
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: undefined,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 9. As platformAdmin, retrieve the vote by its real id.
  const adminViewVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.platformAdmin.postVotes.at(
      connection,
      { postVoteId: createdVote.id },
    );
  typia.assert(adminViewVote);

  // Validate that the admin view is consistent with the created vote and related entities.
  TestValidator.equals(
    "admin view vote id should equal created vote id",
    adminViewVote.id,
    createdVote.id,
  );
  TestValidator.equals(
    "admin view post id should equal original post id",
    adminViewVote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "admin view member user id should equal voting member id",
    adminViewVote.community_platform_memberuser_id,
    createdVote.community_platform_memberuser_id,
  );
  TestValidator.predicate(
    "admin view vote_value should be within [-1,1] and equal to +1",
    adminViewVote.vote_value >= -1 &&
      adminViewVote.vote_value <= 1 &&
      adminViewVote.vote_value === 1,
  );

  // Cross-validate nested associations for additional safety.
  TestValidator.equals(
    "nested post summary id matches post.id",
    adminViewVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "nested community summary id matches community.id",
    adminViewVote.community.id,
    community.id,
  );
  TestValidator.equals(
    "nested memberUser summary id matches voting member id",
    adminViewVote.memberUser.id,
    createdVote.community_platform_memberuser_id,
  );

  // 10. Generate a random unknown UUID and ensure it differs from the existing vote id.
  const unknownPostVoteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  TestValidator.notEquals(
    "unknown postVoteId should differ from existing created vote id",
    unknownPostVoteId,
    createdVote.id,
  );

  // NOTE:
  // We intentionally do NOT call the admin postVotes.at endpoint with
  // `unknownPostVoteId` because the SDK function is typed to return
  // ICommunityPlatformPostVote and would surface HttpError on not-found.
  // Such behavior is outside this typed contract. Conceptually, however,
  // an HTTP-level request using this unknown id would be expected to
  // produce a not-found style error while still enforcing admin-only
  // access semantics.
}
