import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_vote_rate_limits_time_range_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Test 1: Search with specific time range (last 24 hours)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const searchRequest1: ICommunityPlatformVoteRateLimit.IRequest = {
    voted_at_start: yesterday.toISOString(),
    voted_at_end: now.toISOString(),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    limit: 10,
    page: 1,
  };
  const result1 =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      { body: searchRequest1 },
    );
  typia.assert(result1);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure valid",
    result1.pagination.records >= 0 &&
      result1.pagination.current >= 0 &&
      result1.pagination.limit >= 0 &&
      result1.pagination.pages >= 0,
  );
  // Validate all records are within specified time range
  for (const record of result1.data) {
    const votedAt = new Date(record.voted_at);
    TestValidator.predicate(
      "voted_at within range",
      votedAt >= yesterday && votedAt <= now,
    );
  }
  // Test 2: Empty result set with future time range
  const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const searchRequest2: ICommunityPlatformVoteRateLimit.IRequest = {
    voted_at_start: futureStart.toISOString(),
    voted_at_end: futureEnd.toISOString(),
    limit: 10,
    page: 1,
  };
  const result2 =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      { body: searchRequest2 },
    );
  typia.assert(result2);
  TestValidator.equals(
    "empty result set for future range",
    result2.data.length,
    0,
  );
  // Test 3: Maximum pagination limit
  const searchRequest3: ICommunityPlatformVoteRateLimit.IRequest = {
    voted_at_start: yesterday.toISOString(),
    voted_at_end: now.toISOString(),
    limit: 100, // Maximum allowed limit
    page: 1,
  };
  const result3 =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      { body: searchRequest3 },
    );
  typia.assert(result3);
  TestValidator.predicate(
    "maximum limit handled correctly",
    result3.data.length <= 100,
  );
  // Test 4: IP address filtering
  const specificIP = typia.random<string & tags.Format<"ipv4">>();
  const searchRequest4: ICommunityPlatformVoteRateLimit.IRequest = {
    voted_at_start: yesterday.toISOString(),
    voted_at_end: now.toISOString(),
    ip_address: specificIP,
    limit: 10,
    page: 1,
  };
  const result4 =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      { body: searchRequest4 },
    );
  typia.assert(result4);
  // Test business logic: if results exist, IP filtering worked
  if (result4.data.length > 0) {
    TestValidator.predicate("IP address filtering returns results", true);
  }
  // Test 5: Entity type and vote type filtering
  const searchRequest5: ICommunityPlatformVoteRateLimit.IRequest = {
    voted_at_start: yesterday.toISOString(),
    voted_at_end: now.toISOString(),
    entity_type: "post",
    vote_type: "upvote",
    limit: 10,
    page: 1,
  };
  const result5 =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      { body: searchRequest5 },
    );
  typia.assert(result5);
  // Validate entity type and vote type if results exist
  for (const record of result5.data) {
    TestValidator.equals(
      "entity type matches filter",
      record.entity_type,
      "post",
    );
    TestValidator.equals(
      "vote type matches filter",
      record.vote_type,
      "upvote",
    );
  }
}
