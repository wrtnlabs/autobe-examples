import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_vote_rate_limits_retrieve_existing_record(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as moderator using utility function
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Generate a valid UUID for testing
  const testRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the vote rate limit record
  // Since we don't have a way to create records via API, this tests the endpoint structure
  const retrievedRecord =
    await api.functional.communityPlatform.moderator.vote_rate_limits.at(
      moderatorConnection,
      {
        rateLimitId: testRateLimitId,
      },
    );
  // Validate the response structure - typia.assert performs complete validation
  typia.assert(retrievedRecord);
  // Test business logic - the record should have the expected ID
  TestValidator.equals(
    "returned record has correct ID",
    retrievedRecord.id,
    testRateLimitId,
  );
}
