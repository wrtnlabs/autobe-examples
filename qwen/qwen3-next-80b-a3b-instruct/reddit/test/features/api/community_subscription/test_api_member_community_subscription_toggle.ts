import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunitySubscription";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_community_subscription_toggle(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create three communities for testing
  const community1: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const community3: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community3);
  // Step 4: Toggle subscription - subscribe to community1 and community2, unsubscribe from community3 (which isn't subscribed yet)
  // This should create subscriptions for community1 and community2, and have no effect on community3
  const toggleResult: IPageICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.member.users.subscriptions.update(
      memberConnection,
      {
        body: {
          communityIds: [
            community1.id,
            community2.id,
            community3.id,
          ] satisfies ICommunityBbsCommunitySubscription.IRequest["communityIds"],
        },
      },
    );
  typia.assert(toggleResult);
  // Step 5: Validate subscription results
  // Should have two subscriptions: community1 and community2 (both newly created)
  // community3 should NOT be subscribed (wasn't subscribed to begin with, so unsubscribe had no effect)
  TestValidator.equals(
    "final subscription count is 2",
    toggleResult.data.length,
    2,
  );
  // Verify that community1 and community2 are subscribed
  const subscribedCommunityIds = toggleResult.data.map(
    (sub) => sub.community_id,
  );
  TestValidator.predicate(
    "community1 is subscribed",
    subscribedCommunityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "community2 is subscribed",
    subscribedCommunityIds.includes(community2.id),
  );
  TestValidator.predicate(
    "community3 is not subscribed",
    !subscribedCommunityIds.includes(community3.id),
  );
  // Step 6: Verify idempotent behavior - run the same toggle again
  const secondToggleResult: IPageICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.member.users.subscriptions.update(
      memberConnection,
      {
        body: {
          communityIds: [
            community1.id,
            community2.id,
            community3.id,
          ] satisfies ICommunityBbsCommunitySubscription.IRequest["communityIds"],
        },
      },
    );
  typia.assert(secondToggleResult);
  // Should now have subscriptions for community1 and community2 removed (unsubscribed), and community3 added (subscribed)
  // Final state: only community3 subscribed
  TestValidator.equals(
    "second toggle subscription count is 1",
    secondToggleResult.data.length,
    1,
  );
  const secondSubscribedCommunityIds = secondToggleResult.data.map(
    (sub) => sub.community_id,
  );
  TestValidator.predicate(
    "community1 is not subscribed after idempotent toggle",
    !secondSubscribedCommunityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "community2 is not subscribed after idempotent toggle",
    !secondSubscribedCommunityIds.includes(community2.id),
  );
  TestValidator.predicate(
    "community3 is subscribed after idempotent toggle",
    secondSubscribedCommunityIds.includes(community3.id),
  );
  // Step 7: Verify that only existing communities are processed
  // Try to toggle with a non-existent community ID (invalid UUID format)
  const invalidCommunityId = "invalid-uuid-format";
  const invalidToggleResult: IPageICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.member.users.subscriptions.update(
      memberConnection,
      {
        body: {
          communityIds: [
            community1.id,
            community2.id,
            invalidCommunityId,
          ] satisfies ICommunityBbsCommunitySubscription.IRequest["communityIds"],
        },
      },
    );
  typia.assert(invalidToggleResult);
  // Should still have the same subscription state as before (community3 only)
  // The invalid ID should be ignored
  TestValidator.equals(
    "invalid ID toggle subscription count is still 1",
    invalidToggleResult.data.length,
    1,
  );
  const invalidSubscribedCommunityIds = invalidToggleResult.data.map(
    (sub) => sub.community_id,
  );
  TestValidator.predicate(
    "community3 is still subscribed after invalid ID",
    invalidSubscribedCommunityIds.includes(community3.id),
  );
  // Final verification: the invalid ID was ignored, and no error occurred
  // (This verifies data integrity and idempotent behavior with malformed input)
}
