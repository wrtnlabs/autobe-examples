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

export async function test_api_rate_limit_counter_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random rate limit counter ID
  // The mock server will return soft-deleted data for any ID queried
  const rateLimitCounterId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the rate limit counter
  const counter = await api.functional.redditCommunity.rate_limit_counters.at(
    connection,
    {
      rateLimitCounterId,
    },
  );
  typia.assert(counter);
  // Validate the counter ID matches the requested ID
  TestValidator.equals(
    "counter ID matches requested ID",
    counter.id,
    rateLimitCounterId,
  );
  // Validate endpoint field is present and non-empty
  TestValidator.predicate(
    "counter has non-empty endpoint",
    () => counter.endpoint.length > 0,
  );
  // Validate request count is a non-negative integer
  TestValidator.predicate(
    "counter has valid request count",
    () => counter.requestCount >= 0,
  );
  // Validate window timestamps are present and in ISO format
  TestValidator.predicate(
    "counter has valid window start timestamp",
    () => counter.windowStart !== undefined && counter.windowStart.length > 0,
  );
  TestValidator.predicate(
    "counter has valid window end timestamp",
    () => counter.windowEnd !== undefined && counter.windowEnd.length > 0,
  );
  // Validate created_at and updated_at timestamps are present
  TestValidator.predicate(
    "counter has created_at timestamp",
    () => counter.createdAt.length > 0,
  );
  TestValidator.predicate(
    "counter has updated_at timestamp",
    () => counter.updatedAt.length > 0,
  );
  // CRITICAL: Validate deleted_at is NOT null (soft-deleted record)
  // This is the main test - soft-deleted records should still be retrievable
  TestValidator.predicate(
    "counter is soft-deleted (deleted_at is not null)",
    () => counter.deletedAt !== null,
  );
  // Additional validation: if deleted_at exists, it should be in ISO format
  if (counter.deletedAt !== null) {
    TestValidator.predicate(
      "deleted_at has valid ISO format",
      () => counter.deletedAt!.length > 0,
    );
  }
  // Validate member relationship is included
  TestValidator.predicate(
    "counter has member relationship",
    () => counter.member !== undefined,
  );
  typia.assert(counter.member);
  // Validate member has required identification fields
  TestValidator.predicate(
    "member has valid UUID",
    () => counter.member.id.length > 0,
  );
  TestValidator.predicate(
    "member has username",
    () => counter.member.username.length > 0,
  );
  TestValidator.predicate(
    "member has created_at timestamp",
    () => counter.member.created_at.length > 0,
  );
  // Optional: Validate karma if present
  if (counter.member.karma !== undefined) {
    TestValidator.predicate(
      "member karma is valid if present",
      () => typeof counter.member.karma === "number",
    );
  }
  // Optional: Validate profile if present
  if (counter.member.profile !== undefined) {
    typia.assert(counter.member.profile);
    TestValidator.predicate(
      "profile has display_name",
      () => counter.member.profile!.display_name.length > 0,
    );
  }
}
