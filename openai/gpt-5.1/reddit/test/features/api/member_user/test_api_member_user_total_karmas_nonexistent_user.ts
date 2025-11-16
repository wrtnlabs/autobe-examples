import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserTotalKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserTotalKarmas";

/**
 * Validate behavior of GET
 * /communityPlatform/memberUsers/{memberUserId}/totalKarmas when the target
 * member user does NOT exist.
 *
 * Business context:
 *
 * - The endpoint exposes aggregated karma metrics from
 *   community_platform_user_total_karmas.
 * - According to the description, clients should be able to call this for any
 *   member user id and get a stable, well-defined response, even when the
 *   aggregate row does not exist yet (for new or unknown users), instead of
 *   encountering server-side failures.
 * - The preferred behavior is to respond with a 200 OK and a zero-valued
 *   ICommunityPlatformUserTotalKarmas object, but an implementation might also
 *   choose to return a documented 4xx. We will lock in the behavior actually
 *   implemented by the SDK.
 *
 * Test strategy:
 *
 * 1. Prepare normal, "control" data paths to ensure the surrounding system is
 *    wired correctly:
 *
 *    - Create a platform admin via /auth/platformAdmin/join.
 *    - As that admin, create a community visibility level via
 *         /communityPlatform/platformAdmin/communityVisibilityLevels.
 *    - Create a member user via /auth/memberUser/join.
 *    - As that member user, create a community using
 *         /communityPlatform/memberUser/communities with the created
 *         visibilityLevel.code.
 *    - Still as that member user, create a subscription via
 *         /communityPlatform/memberUser/subscriptions targeting that
 *         community.
 *
 *    This control flow ensures that the community/karma pipeline is capable of
 *    producing aggregates for real users, even though we will not assert on
 *    those aggregates in this test (other tests will cover normal case).
 * 2. Construct a memberUserId which we know does NOT correspond to any registered
 *    member user in this test:
 *
 *    - We take a random UUID for the nonexistent id.
 *    - We ensure this id differs from the joined member user id by explicit
 *         comparison and, if by chance they coincide, we regenerate.
 * 3. Ensure that the subsequent call is effectively unauthenticated:
 *
 *    - The SDK automatically manages Authorization headers on the shared connection
 *         instance whenever we call auth.* endpoints.
 *    - For this test, when we call the totalKarmas endpoint, we want to simulate a
 *         client without Authorization header.
 *    - To do this without touching connection.headers (forbidden), we create a
 *         shallow-cloned connection object that has an empty headers object and
 *         pass it into the totalKarmas call. We never mutate headers beyond
 *         that one-time clone.
 * 4. Call GET /communityPlatform/memberUsers/{memberUserId}/totalKarmas with the
 *    nonexistent memberUserId using the unauthenticated connection.
 *
 *    - Using api.functional.communityPlatform.memberUsers.totalKarmas.at.
 *    - The SDK signature guarantees that on success we receive an
 *         ICommunityPlatformUserTotalKarmas object.
 * 5. Assert correctness of behavior for the nonexistent user case:
 *
 *    - First, typia.assert(response) to ensure full structural correctness of the
 *         returned aggregate.
 *    - Then, assert that total_karma, post_karma, and comment_karma are all zero.
 *    - Assert that member_user_id matches the nonexistent memberUserId we passed,
 *         confirming that the aggregate is conceptually attached to that id
 *         (even if only virtually for the zero-row case).
 * 6. Implicitly, if the server were to respond with 4xx or 5xx instead of the
 *    zero-aggregate 200, the SDK call would throw and the test would fail. This
 *    locks in the contract that the endpoint is safe and predictable to call
 *    even when an aggregate row does not yet exist.
 */
export async function test_api_member_user_total_karmas_nonexistent_user(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authorizationActor: platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility Level",
    description: "Public communities visible to all users",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code matches request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const existingMemberId = memberAuthorized.id;

  // 4. Member user creates a community
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
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
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community creator id matches member user",
    community.creator.id,
    existingMemberId,
  );

  // 5. Member user subscribes to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription member user id matches member user",
    subscription.member_user_id,
    existingMemberId,
  );
  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community_id,
    community.id,
  );

  // 6. Prepare a nonexistent member user id
  let nonexistentMemberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentMemberUserId === existingMemberId) {
    nonexistentMemberUserId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.predicate(
    "nonexistent member user id must differ from existing member",
    nonexistentMemberUserId !== existingMemberId,
  );

  // 7. Create an unauthenticated connection clone (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Call totalKarmas for the nonexistent user without Authorization
  const totalKarmas: ICommunityPlatformUserTotalKarmas =
    await api.functional.communityPlatform.memberUsers.totalKarmas.at(
      unauthenticatedConnection,
      { memberUserId: nonexistentMemberUserId },
    );
  typia.assert(totalKarmas);

  // 9. Assert zero-valued aggregate and correct member_user_id
  TestValidator.equals(
    "aggregate member_user_id matches requested nonexistent id",
    totalKarmas.member_user_id,
    nonexistentMemberUserId,
  );

  TestValidator.equals(
    "total_karma is zero for nonexistent user",
    totalKarmas.total_karma,
    0,
  );
  TestValidator.equals(
    "post_karma is zero for nonexistent user",
    totalKarmas.post_karma,
    0,
  );
  TestValidator.equals(
    "comment_karma is zero for nonexistent user",
    totalKarmas.comment_karma,
    0,
  );
}
