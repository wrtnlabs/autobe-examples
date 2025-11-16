import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that a member user cannot delete another member's public profile by
 * handle, while allowing self-deletion for the profile owner.
 *
 * Business rule: destructive profile operations are ownership-bound. A member
 * may erase their own public profile through the memberUser-scoped endpoint,
 * but must never be able to erase another member's profile.
 *
 * Scenario:
 *
 * 1. Register Member A via POST /auth/memberUser/join (auth.memberUser.join),
 *    capturing A's username.
 * 2. As Member A, create a community via POST
 *    /communityPlatform/memberUser/communities
 *    (communityPlatform.memberUser.communities.create) to ensure A has valid
 *    memberUser context and to exercise typical authenticated usage.
 * 3. Register Member B via another auth.memberUser.join call, capturing B's
 *    username.
 * 4. As Member B, create a community via
 *    communityPlatform.memberUser.communities.create, again to exercise a
 *    normal authenticated flow.
 * 5. Switch back to Member A by calling auth.memberUser.join again with A's
 *    credentials, letting the SDK swap Authorization to A's token.
 * 6. With Member A authenticated, attempt DELETE
 *    /communityPlatform/memberUser/profiles/{handle} using handle = B.username
 *    via communityPlatform.memberUser.profiles.erase. Assert that this call
 *    fails by using TestValidator.error to verify that some error is thrown
 *    (without asserting a specific HTTP status code).
 * 7. Switch to Member B by calling auth.memberUser.join again with B's
 *    credentials, letting the SDK set Authorization accordingly.
 * 8. With Member B authenticated, call communityPlatform.memberUser.profiles.erase
 *    again using handle = B.username. This should succeed (no error thrown) as
 *    B is deleting their own profile.
 *
 * Implementation notes:
 *
 * - Use ICommunityPlatformMemberuser.IJoin as the body type for join calls, and
 *   ICommunityPlatformMemberuser.IAuthorized for responses.
 * - Use ICommunityPlatformCommunity.ICreate as the body type for community
 *   creation.
 * - Do not touch connection.headers directly; rely on SDK's auth.memberUser.join
 *   behavior to manage Authorization headers.
 * - Use TestValidator.error for the forbidden deletion attempt, and do not test
 *   specific HTTP status codes.
 * - All non-void responses must be validated with typia.assert().
 */
export async function test_api_member_user_profile_delete_forbidden_on_other_profile(
  connection: api.IConnection,
) {
  // Helper to build a join body with customizable username/email pair.
  const buildJoinBody = (username: string, email: string) =>
    ({
      username,
      email,
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }) satisfies ICommunityPlatformMemberuser.IJoin;

  // Helper to build a valid community creation body.
  const buildCommunityBody = () => {
    const slugBase = RandomGenerator.alphabets(8);
    const nameBase = RandomGenerator.alphabets(10);
    return {
      slug: slugBase,
      name: nameBase,
      description: null,
      visibility: "public",
      status: "active",
      is_nsfw: false,
      is_quarantined: false,
      is_posting_restricted: false,
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
    } satisfies ICommunityPlatformCommunity.ICreate;
  };

  // 1. Register Member A
  const memberAUsername = RandomGenerator.alphabets(8); // within [3,32]
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAJoinBody = buildJoinBody(memberAUsername, memberAEmail);

  const memberAAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuth);

  // Sanity check: captured username matches response
  TestValidator.equals(
    "Member A username echoed correctly",
    memberAAuth.username,
    memberAUsername,
  );

  // 2. As Member A, create a community
  const communityABody = buildCommunityBody();
  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityABody,
      },
    );
  typia.assert(communityA);

  // 3. Register Member B
  const memberBUsername = RandomGenerator.alphabets(8);
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBJoinBody = buildJoinBody(memberBUsername, memberBEmail);

  const memberBAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuth);

  TestValidator.equals(
    "Member B username echoed correctly",
    memberBAuth.username,
    memberBUsername,
  );

  // 4. As Member B, create a community
  const communityBBody = buildCommunityBody();
  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBBody,
      },
    );
  typia.assert(communityB);

  // 5. Switch back to Member A by re-joining with A's credentials
  const memberAReAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAReAuth);
  TestValidator.equals(
    "Re-auth Member A username consistent",
    memberAReAuth.username,
    memberAUsername,
  );

  // 6. As Member A, attempt to delete Member B's profile by B's username as handle.
  await TestValidator.error(
    "Member A cannot delete Member B profile by handle",
    async () => {
      await api.functional.communityPlatform.memberUser.profiles.erase(
        connection,
        {
          handle: memberBUsername,
        },
      );
    },
  );

  // 7. Switch to Member B again
  const memberBReAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBReAuth);
  TestValidator.equals(
    "Re-auth Member B username consistent",
    memberBReAuth.username,
    memberBUsername,
  );

  // 8. As Member B, delete own profile; this should succeed without error.
  await api.functional.communityPlatform.memberUser.profiles.erase(connection, {
    handle: memberBUsername,
  });
}
