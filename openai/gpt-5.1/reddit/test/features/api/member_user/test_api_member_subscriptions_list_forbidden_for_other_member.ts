import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Validate that member-scoped subscription listing is restricted to the
 * authenticated member user, and that cross-user access is forbidden.
 *
 * ## Business goal
 *
 * Ensure that the endpoint PATCH
 * /communityPlatform/memberUser/members/{memberUserId}/subscriptions only
 * allows a member user to retrieve _their own_ subscriptions and does not leak
 * subscription data for other members, even when the caller has a valid
 * memberUser session.
 *
 * ## High-level steps
 *
 * 1. Register Member A via memberUser join and capture the resulting
 *    ICommunityPlatformMemberuser.IAuthorized object.
 * 2. Under Member A's authenticated context, create a community via
 *    api.functional.communityPlatform.memberUser.communities.create using
 *    ICommunityPlatformCommunity.ICreate.
 * 3. Still as Member A, create a subscription to that community using
 *    api.functional.communityPlatform.memberUser.subscriptions.create with
 *    ICommunityPlatformCommunitySubscription.ICreate, so that Member A
 *    definitely has at least one active subscription record.
 * 4. Register Member B with a second call to memberUser join, obtaining a separate
 *    ICommunityPlatformMemberuser.IAuthorized context (SDK will switch
 *    Authorization header automatically).
 * 5. As Member B, call the member-scoped subscriptions listing endpoint
 *    api.functional.communityPlatform.memberUser.members.subscriptions.index
 *    with `memberUserId` set to Member A's id and some reasonable
 *    ICommunityPlatformCommunitySubscription.IRequest search payload.
 * 6. Confirm that the call fails with an authorization error rather than returning
 *    a normal paginated page. We use TestValidator.error here to assert that an
 *    error is thrown; we do not assert the specific HTTP status code to avoid
 *    coupling to status-level details.
 * 7. Additionally, verify that using Member B's own id in the same endpoint
 *    succeeds and returns a normal page response
 *    (IPageICommunityPlatformCommunitySubscription.ISummary). Business rules
 *    allow the list to be empty; we only assert type correctness and that the
 *    data's member_user.id values, when present, match Member B's id.
 *
 * ## Notes and constraints
 *
 * - We must not touch connection.headers directly; authentication switching is
 *   entirely driven by calling the join endpoint, which updates the
 *   Authorization header automatically.
 * - We rely on typia.random<...>() to produce valid DTO instances where
 *   appropriate, and typia.assert(...) to validate the responses.
 * - We do not attempt to inspect HTTP status codes; we only validate that the
 *   cross-user listing invocation results in some error.
 */
export async function test_api_member_subscriptions_list_forbidden_for_other_member(
  connection: api.IConnection,
) {
  // 1. Register Member A via join
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join/memberA",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. As Member A, create a community
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Still as Member A, create a subscription to that community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const memberASubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(memberASubscription);
  TestValidator.equals(
    "subscription belongs to member A",
    memberASubscription.memberUser.id,
    memberA.id,
  );

  // 4. Register Member B via join (this will switch Authorization header)
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join/memberB",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 5~6. As Member B, attempt to list subscriptions for Member A
  const crossUserRequestBody = {
    page: 0,
    limit: 10,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  await TestValidator.error(
    "member B cannot list subscriptions of member A",
    async () => {
      await api.functional.communityPlatform.memberUser.members.subscriptions.index(
        connection,
        {
          memberUserId: memberA.id,
          body: crossUserRequestBody,
        },
      );
    },
  );

  // 7. Member B can list own subscriptions successfully (likely empty)
  const selfListRequestBody = {
    page: 0,
    limit: 10,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const selfPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.members.subscriptions.index(
      connection,
      {
        memberUserId: memberB.id,
        body: selfListRequestBody,
      },
    );
  typia.assert(selfPage);

  // Ensure all returned summaries, if any, are for member B
  for (const summary of selfPage.data) {
    TestValidator.equals(
      "each returned subscription summary belongs to member B",
      summary.member_user.id,
      memberB.id,
    );
  }
}
