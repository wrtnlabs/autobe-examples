import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalSubscription";

/**
 * Validate that a member cannot list another member's subscriptions.
 *
 * Business context:
 *
 * - Subscriptions are considered private account data and by default a member may
 *   only list their own subscriptions. This test ensures that another
 *   authenticated member cannot list someone else's subscriptions.
 *   Implementations may respond with 403 Forbidden or 404 Not Found (existence
 *   hiding); either is accepted by the test.
 *
 * Steps:
 *
 * 1. Register member A (owner) via POST /auth/member/join.
 * 2. As member A, create a community via POST /communityPortal/member/communities.
 * 3. As member A, create a subscription to that community via POST
 *    /communityPortal/member/communities/{communityId}/subscriptions.
 * 4. As member A, list their subscriptions to confirm the prerequisite exists.
 * 5. Register member B (different user) via POST /auth/member/join.
 * 6. As member B, attempt to GET
 *    /communityPortal/member/users/{memberA.id}/subscriptions and assert that
 *    the call fails with 403 or 404.
 */
export async function test_api_subscription_list_forbidden_other_user(
  connection: api.IConnection,
) {
  // 1. Create member A (owner)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = RandomGenerator.alphaNumeric(8);
  const memberA: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberAUsername,
        email: memberAEmail,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(memberA);

  // 2. As member A, create a community
  const communityReq = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityReq,
    });
  typia.assert(community);

  // 3. As member A, subscribe to the community
  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription belongs to created community",
    subscription.community_id,
    community.id,
  );

  // 4. Sanity check: as member A, list own subscriptions (should succeed)
  const page: IPageICommunityPortalSubscription.ISummary =
    await api.functional.communityPortal.member.users.subscriptions.index(
      connection,
      {
        userId: memberA.id,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "prerequisite subscription exists for member A",
    page.data.length > 0,
  );

  // 5. Create member B (requester). This will overwrite connection's auth header.
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = RandomGenerator.alphaNumeric(8);
  const memberB: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberBUsername,
        email: memberBEmail,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(memberB);

  // 6. As member B, attempt to list member A's subscriptions and expect 403 or 404
  await TestValidator.httpError(
    "other member cannot list a user's subscriptions",
    [403, 404],
    async () => {
      await api.functional.communityPortal.member.users.subscriptions.index(
        connection,
        {
          userId: memberA.id,
        },
      );
    },
  );
}
