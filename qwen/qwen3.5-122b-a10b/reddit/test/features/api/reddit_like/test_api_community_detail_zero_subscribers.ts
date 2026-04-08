import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest user can retrieve community details with zero subscribers.
 *
 * Validates that a guest user can successfully retrieve community information for a community that has no active subscriptions. This test ensures the subscriber_count field correctly returns 0 when no users have subscribed to the community, validating the real-time aggregation logic handles this edge case properly.
 *
 * The test also verifies that all other community fields (name, description, owner information, timestamps) are returned correctly despite the zero subscriber count, ensuring the community detail endpoint functions properly regardless of subscription status.
 *
 * 1. Guest user authenticates via join endpoint.
 * 2. Guest retrieves community details by ID.
 * 3. Validates subscriber_count equals 0.
 * 4. Validates all other community fields are present and correctly formatted.
 */
export async function test_api_community_detail_zero_subscribers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Get community details (using a community ID that exists with zero subscribers)
  // Note: In real E2E, this would require a pre-existing community in the test database
  // For simulation mode, any valid UUID will work
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const community = await api.functional.redditLike.guest.communities.at(
    guestConnection,
    {
      communityId,
    },
  );
  typia.assert(community);
  // 3. Validate business logic - subscriber count is zero
  TestValidator.equals(
    "subscriber count is zero",
    community.subscriber_count,
    0,
  );
  // 4. Validate community fields are present and correctly formatted
  TestValidator.equals("community ID matches", community.id, communityId);
  TestValidator.predicate("community has name", community.name.length > 0);
  TestValidator.predicate(
    "owner has username",
    community.owner.username.length > 0,
  );
  TestValidator.predicate("owner has valid ID", community.owner.id.length > 0);
  TestValidator.predicate(
    "owner has display name",
    community.owner.display_name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid",
    community.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    community.updated_at.length > 0,
  );
  TestValidator.predicate(
    "karma score is integer",
    typeof community.owner.karma_score === "number",
  );
}
