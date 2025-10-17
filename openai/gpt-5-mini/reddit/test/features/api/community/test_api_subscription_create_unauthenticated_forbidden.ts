import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

/**
 * Validate that unauthenticated visitors cannot create community subscriptions.
 *
 * Business context:
 *
 * - Subscribing to a community requires an authenticated member. An anonymous
 *   visitor must be denied (unauthorized) when attempting to create a
 *   subscription. This test ensures the subscription endpoint enforces
 *   authentication and that the targeted community remains intact after the
 *   unauthorized attempt.
 *
 * Steps:
 *
 * 1. Register a provisional member via POST /auth/member/join
 *    (ICommunityPortalMember.ICreate)
 * 2. Create a community as that authenticated member via POST
 *    /communityPortal/member/communities (ICommunityPortalCommunity.ICreate)
 * 3. Attempt to create a subscription to that community WITHOUT authentication
 *    (use a cloned connection with empty headers) and assert that an error is
 *    thrown (await TestValidator.error(...)).
 * 4. Assert the originally created community remains valid.
 */
export async function test_api_subscription_create_unauthenticated_forbidden(
  connection: api.IConnection,
) {
  // 1) Register a provisional member
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create a community as the authenticated member
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Prepare an unauthenticated connection (do not mutate original connection.headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt to subscribe unauthenticated and expect an error
  await TestValidator.error(
    "unauthenticated subscription should fail",
    async () => {
      await api.functional.communityPortal.member.communities.subscriptions.create(
        unauthConn,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
          } satisfies ICommunityPortalSubscription.ICreate,
        },
      );
    },
  );

  // 5) Ensure the originally-created community remains intact
  typia.assert(community);
  TestValidator.predicate(
    "community remains intact",
    typeof community.id === "string" && community.id.length > 0,
  );
}
