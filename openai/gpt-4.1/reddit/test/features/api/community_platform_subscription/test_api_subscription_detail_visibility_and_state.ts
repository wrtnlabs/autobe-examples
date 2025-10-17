import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Validates the member's ability to view their own subscription details, checks
 * metadata, update upon unsubscribe, and verifies access denial for other
 * members.
 *
 * Steps:
 *
 * 1. Register/testMember (main actor) and anotherMember (used for negative access)
 * 2. TestMember: create a new community
 * 3. TestMember: subscribe to this community
 * 4. TestMember: fetch subscription detail - expect all fields present and
 *    deleted_at null
 * 5. TestMember: unsubscribe from this community
 * 6. TestMember: fetch subscription detail - expect deleted_at to be non-null
 * 7. AnotherMember: attempt to fetch testMember's subscription - expect error
 */
export async function test_api_subscription_detail_visibility_and_state(
  connection: api.IConnection,
) {
  // 1. Register test member (main actor)
  const testMemberEmail = typia.random<string & tags.Format<"email">>();
  const testMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: testMemberEmail,
        password: "StrongPass123!",
      },
    });
  typia.assert(testMember);

  // 2. Register another member (for negative case)
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: anotherEmail,
        password: "AnotherPass456!",
      },
    });
  typia.assert(anotherMember);

  // Authenticate again as testMember
  await api.functional.auth.member.join(connection, {
    body: {
      email: testMemberEmail,
      password: "StrongPass123!",
    },
  });

  // 3. testMember creates a new community
  const communityReq = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityReq },
    );
  typia.assert(community);

  // 4. Subscribe testMember to community
  const subscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);

  // 5. Fetch subscription detail as testMember
  const fetched: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.at(connection, {
      subscriptionId: subscription.id,
    });
  typia.assert(fetched);
  TestValidator.equals(
    "fetched subscription.Id matches created",
    fetched.id,
    subscription.id,
  );
  TestValidator.equals("correct member_id", fetched.member_id, testMember.id);
  TestValidator.equals(
    "correct community_id",
    fetched.community_id,
    community.id,
  );
  TestValidator.equals(
    "deleted_at is null for active subscription",
    fetched.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof fetched.created_at === "string" &&
      !isNaN(Date.parse(fetched.created_at)),
  );

  // 6. Unsubscribe
  await api.functional.communityPlatform.member.subscriptions.erase(
    connection,
    {
      subscriptionId: subscription.id,
    },
  );

  // 7. Fetch subscription detail again as testMember (should be marked unsubscribed)
  const fetchedAfterDelete: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.at(connection, {
      subscriptionId: subscription.id,
    });
  typia.assert(fetchedAfterDelete);
  TestValidator.notEquals(
    "deleted_at set after unsubscribe",
    fetchedAfterDelete.deleted_at,
    null,
  );

  // 8. Authenticate as another member
  await api.functional.auth.member.join(connection, {
    body: {
      email: anotherEmail,
      password: "AnotherPass456!",
    },
  });

  // 9. Check anotherMember cannot access testMember's subscription
  await TestValidator.error(
    "other member cannot access this subscription detail",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.at(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
