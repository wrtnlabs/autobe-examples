import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test subscription list sorting options.
 *
 * Test that the sorting options work correctly for the member's subscription list.
 * After authentication and subscribing to multiple communities with different names
 * and subscriber counts, the member requests their subscription list with different
 * sortBy values: 'alphabetical' sorts communities by name ascending, 'date' sorts
 * by subscription created_at descending (most recent first), and 'subscribers' sorts
 * by community subscriber count descending (highest first). Each sorting option
 * should return the same subscriptions but in the correct order.
 */
export async function test_api_subscription_list_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple communities with different names for alphabetical sorting
  // Use names that will have clear alphabetical ordering
  const communityAlpha =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Alpha_Community",
          description: "Community starting with A for sorting test",
        },
      },
    );
  typia.assert(communityAlpha);
  const communityBeta =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Beta_Community",
          description: "Community starting with B for sorting test",
        },
      },
    );
  typia.assert(communityBeta);
  const communityGamma =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Gamma_Community",
          description: "Community starting with G for sorting test",
        },
      },
    );
  typia.assert(communityGamma);
  const communityDelta =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Delta_Community",
          description: "Community starting with D for sorting test",
        },
      },
    );
  typia.assert(communityDelta);
  // 3. Create another member to subscribe and increase subscriber counts for some communities
  const subscriber2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(subscriber2Connection, {});
  // Subscribe second member to Beta and Gamma to increase their subscriber counts
  await api.functional.community.member.communities.subscriptions.create(
    subscriber2Connection,
    { communityName: communityBeta.name },
  );
  await api.functional.community.member.communities.subscriptions.create(
    subscriber2Connection,
    { communityName: communityGamma.name },
  );
  // Create third member to subscribe to Gamma only (highest subscriber count)
  const subscriber3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(subscriber3Connection, {});
  await api.functional.community.member.communities.subscriptions.create(
    subscriber3Connection,
    { communityName: communityGamma.name },
  );
  // 4. Subscribe the main member to communities in specific order (for date sorting)
  // Alpha first (oldest), then Beta, then Delta, then Gamma (newest)
  await api.functional.community.member.communities.subscriptions.create(
    memberConnection,
    { communityName: communityAlpha.name },
  );
  // Small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.functional.community.member.communities.subscriptions.create(
    memberConnection,
    { communityName: communityBeta.name },
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.functional.community.member.communities.subscriptions.create(
    memberConnection,
    { communityName: communityDelta.name },
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.functional.community.member.communities.subscriptions.create(
    memberConnection,
    { communityName: communityGamma.name },
  );
  // 5. Test alphabetical sorting (A-Z by community name)
  const alphabeticalResult =
    await api.functional.community.member.subscriptions.index(
      memberConnection,
      { body: { sortBy: "alphabetical", limit: 100 } },
    );
  typia.assert(alphabeticalResult);
  // Verify alphabetical order: Alpha, Beta, Delta, Gamma
  TestValidator.equals(
    "alphabetical sorting - community names in A-Z order",
    alphabeticalResult.data.map((s) => s.community.name),
    ["Alpha_Community", "Beta_Community", "Delta_Community", "Gamma_Community"],
  );
  // 6. Test date sorting (most recent subscription first)
  const dateResult = await api.functional.community.member.subscriptions.index(
    memberConnection,
    { body: { sortBy: "date", limit: 100 } },
  );
  typia.assert(dateResult);
  // Verify date order (descending): Gamma (newest), Delta, Beta, Alpha (oldest)
  TestValidator.equals(
    "date sorting - most recent subscription first",
    dateResult.data.map((s) => s.community.name),
    ["Gamma_Community", "Delta_Community", "Beta_Community", "Alpha_Community"],
  );
  // 7. Test subscribers sorting (highest subscriber count first)
  const subscribersResult =
    await api.functional.community.member.subscriptions.index(
      memberConnection,
      { body: { sortBy: "subscribers", limit: 100 } },
    );
  typia.assert(subscribersResult);
  // Subscriber counts: Alpha=1, Beta=2, Delta=1, Gamma=3
  // Order by subscriber count descending: Gamma(3), Beta(2), Alpha(1), Delta(1)
  // Note: Alpha and Delta have same count, order between them may vary
  const subscribersNames = subscribersResult.data.map((s) => s.community.name);
  TestValidator.equals(
    "subscribers sorting - first community (Gamma with 3 subscribers)",
    subscribersNames[0],
    "Gamma_Community",
  );
  TestValidator.equals(
    "subscribers sorting - second community (Beta with 2 subscribers)",
    subscribersNames[1],
    "Beta_Community",
  );
  TestValidator.predicate(
    "subscribers sorting - Alpha and Delta are last two (order may vary)",
    subscribersNames.includes("Alpha_Community") &&
      subscribersNames.includes("Delta_Community"),
  );
  // 8. Verify same subscriptions returned for all sort options
  const alphabeticalIds = alphabeticalResult.data.map((s) => s.id).sort();
  const dateIds = dateResult.data.map((s) => s.id).sort();
  const subscribersIds = subscribersResult.data.map((s) => s.id).sort();
  TestValidator.equals(
    "all sort options return same subscription IDs",
    JSON.stringify(alphabeticalIds),
    JSON.stringify(dateIds),
  );
  TestValidator.equals(
    "date and subscribers return same subscription IDs",
    JSON.stringify(dateIds),
    JSON.stringify(subscribersIds),
  );
}
