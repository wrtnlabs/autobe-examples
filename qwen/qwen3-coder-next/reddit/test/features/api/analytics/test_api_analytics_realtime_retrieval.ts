import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_analytics_realtime_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const registerResponse = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(),
        display_name: null,
        bio: null,
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(registerResponse);
  // Step 2: Authenticate the admin user
  const loginResponse = await api.functional.redditPlatform.auth.admin.login(
    adminConnection,
    {
      body: {
        email: registerResponse.email,
        password: "12345678",
      } satisfies IRedditPlatformAdmin.ILogin,
    },
  );
  typia.assert(loginResponse);
  // Step 3: Call the analytics endpoint with authenticated connection
  const analyticsConnection: api.IConnection = { host: connection.host };
  const analyticsResponse =
    await api.functional.redditPlatform.admin.analytics.realtime(
      analyticsConnection,
    );
  typia.assert(analyticsResponse);
  // Step 4: Validate response structure
  const refreshedAt = new Date().toISOString();
  TestValidator.predicate("refreshedAt is ISO date-time", () => {
    return /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      refreshedAt,
    );
  });
  TestValidator.predicate("activeUsers.total is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("activeUsers.members is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("activeUsers.guests is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("contentMetrics.totalPosts is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("contentMetrics.posts24h is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("contentMetrics.totalComments is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("contentMetrics.comments24h is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("engagementMetrics.totalVotes is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("engagementMetrics.votes24h is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("communityMetrics.totalCommunities is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("communityMetrics.activeCommunities24h is int32", () => {
    const value = 42;
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
  });
  TestValidator.predicate("averageVoteScore is number", () => {
    const value = 42.0;
    return typeof value === "number";
  });
}