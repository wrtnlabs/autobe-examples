import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRateLimitCounter";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_rate_limit_counter_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid rate limit counter UUID
  const rateLimitCounterId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create an actor-specific connection for this test
  const actorConnection: api.IConnection = { host: connection.host };
  // 3. Retrieve the rate limit counter record
  const response = await api.functional.redditCommunity.rate_limit_counters.at(
    actorConnection,
    { rateLimitCounterId },
  );
  typia.assert(response);
  // 4. Validate counter ID matches the request ID
  TestValidator.equals(
    "counter id matches request",
    response.id,
    rateLimitCounterId,
  );
  // 5. Validate endpoint is a non-empty string
  TestValidator.predicate(
    "endpoint is non-empty string",
    response.endpoint.length > 0,
  );
  // 6. Validate request count is a valid positive integer
  TestValidator.predicate(
    "request count is non-negative",
    response.requestCount >= 0,
  );
  // 7. Validate deletedAt is null for active records
  TestValidator.equals(
    "deleted at is null for active record",
    response.deletedAt,
    null,
  );
  // 8. Validate window boundaries exist and end is after start
  const windowStart = new Date(response.windowStart);
  const windowEnd = new Date(response.windowEnd);
  TestValidator.predicate("window end is after start", windowEnd > windowStart);
  // 9. Calculate time remaining in current rate limit window
  const now = new Date();
  const timeRemaining = windowEnd.getTime() - now.getTime();
  TestValidator.predicate("has valid time remaining", timeRemaining >= -1000); // Allow small margin
  // 10. Validate member relationship is properly joined with identification
  TestValidator.predicate("member exists", response.member !== undefined);
  TestValidator.predicate("member has id", response.member.id !== undefined);
  TestValidator.predicate(
    "member has username",
    response.member.username !== undefined,
  );
  // 11. Validate member profile relationship is joined
  TestValidator.predicate(
    "member profile exists",
    response.member.profile !== undefined,
  );
  TestValidator.predicate(
    "member has karma",
    response.member.karma !== undefined,
  );
  TestValidator.predicate(
    "profile has display name",
    response.member.profile!.display_name !== undefined,
  );
  TestValidator.predicate(
    "profile has karma score",
    response.member.profile!.karma_score !== undefined,
  );
}
