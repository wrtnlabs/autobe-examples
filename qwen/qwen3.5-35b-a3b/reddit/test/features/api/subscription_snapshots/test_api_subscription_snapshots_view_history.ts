import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscriptionSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscriptionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_subscription_snapshots_view_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create subscription with a random community ID (simulating community exists)
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Wait to ensure distinct snapshot timestamps
  await new Promise((resolve) => setTimeout(resolve, 500));
  // 4. Retrieve snapshots for the subscription
  const snapshotResponse =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {} satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate response structure - paginated data
  TestValidator.equals(
    "pagination current defaults to 1",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches default page size",
    snapshotResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records equals data length",
    snapshotResponse.pagination.records === snapshotResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages computed correctly",
    snapshotResponse.pagination.pages ===
      Math.ceil(
        snapshotResponse.pagination.records / snapshotResponse.pagination.limit,
      ),
  );
  TestValidator.equals(
    "data array not empty (subscription has snapshots)",
    snapshotResponse.data.length > 0,
    true,
  );
  // 6. Validate each snapshot record structure
  for (const snapshot of snapshotResponse.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot id valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
      true,
    );
    TestValidator.equals(
      "snapshot_created_at present and valid date",
      Date.parse(snapshot.snapshot_created_at) > 0,
      true,
    );
    TestValidator.equals(
      "created_at present and valid date",
      Date.parse(snapshot.created_at) > 0,
      true,
    );
    TestValidator.equals(
      "updated_at present and valid date",
      Date.parse(snapshot.updated_at) > 0,
      true,
    );
    TestValidator.predicate(
      "updated_at not before created_at",
      Date.parse(snapshot.updated_at) >= Date.parse(snapshot.created_at),
    );
  }
  // 7. Validate ordering - newest snapshots first (snapshot_created_at descending)
  if (snapshotResponse.data.length > 1) {
    for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
      const current = snapshotResponse.data[i];
      const next = snapshotResponse.data[i + 1];
      TestValidator.predicate(
        `snapshots ordered by snapshot_created_at descending at index ${i}`,
        Date.parse(current.snapshot_created_at) >
          Date.parse(next.snapshot_created_at),
      );
    }
  }
  // 8. Validate historical state preservation
  // The first snapshot should have created_at matching the subscription's original creation
  const firstSnapshot = snapshotResponse.data[0];
  TestValidator.equals(
    "first snapshot created_at matches subscription",
    firstSnapshot.created_at,
    subscription.created_at,
  );
  TestValidator.equals(
    "first snapshot updated_at matches subscription",
    firstSnapshot.updated_at,
    subscription.updated_at,
  );
  // 9. Validate snapshot_created_at is at or after subscription creation
  for (const snapshot of snapshotResponse.data) {
    TestValidator.predicate(
      "snapshot_created_at is at or after subscription created_at",
      Date.parse(snapshot.snapshot_created_at) >=
        Date.parse(subscription.created_at),
    );
  }
}
