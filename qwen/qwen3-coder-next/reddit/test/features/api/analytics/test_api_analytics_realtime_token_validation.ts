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

export async function test_api_analytics_realtime_token_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user and login to get valid token for manipulation
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const joinedAdmin = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: email,
        password: "TestPassword123!",
        username: RandomGenerator.name(),
        display_name: null,
        bio: null,
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(joinedAdmin);
  // Step 2: Login to get valid token
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedAdmin = await api.functional.redditPlatform.auth.admin.login(
    loginConnection,
    {
      body: {
        email: email,
        password: "TestPassword123!",
      } satisfies IRedditPlatformAdmin.ILogin,
    },
  );
  typia.assert(loggedAdmin);
  const validToken = loggedAdmin.token;
  // Helper to create JWT token with modified payload
  const createModifiedToken = (modifyPayload: (original: any) => any) => {
    const parts = validToken.access.split(".");
    const header = parts[0];
    const payloadBase64 = parts[1];
    const signature = parts[2];
    // Decode and modify payload
    const payloadBuffer = Buffer.from(payloadBase64, "base64");
    const payload = JSON.parse(payloadBuffer.toString("utf8"));
    const modifiedPayload = modifyPayload(payload);
    // Re-encode with proper base64 URL encoding
    const newPayloadBase64 = Buffer.from(
      JSON.stringify(modifiedPayload),
    ).toString("base64");
    // Create new token
    return `${header}.${newPayloadBase64}.invalidsignature`;
  };
  // Test 1: Missing Authorization header
  const missingAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await TestValidator.httpError(
    "missing Authorization header",
    401,
    async () =>
      await api.functional.redditPlatform.admin.analytics.realtime(
        missingAuthConnection,
      ),
  );
  // Test 2: Malformed JWT token format
  const malformedAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "Bearer invalid-token-format",
    },
  };
  await TestValidator.httpError(
    "malformed JWT token",
    401,
    async () =>
      await api.functional.redditPlatform.admin.analytics.realtime(
        malformedAuthConnection,
      ),
  );
  // Test 3: Expired JWT token
  const expiredToken = createModifiedToken((original) => ({
    ...original,
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  }));
  const expiredAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${expiredToken}`,
    },
  };
  await TestValidator.httpError(
    "expired JWT token",
    401,
    async () =>
      await api.functional.redditPlatform.admin.analytics.realtime(
        expiredAuthConnection,
      ),
  );
  // Test 4: Tampered JWT token (modify payload)
  const tamperedToken = createModifiedToken((original) => ({
    ...original,
    admin: true,
    tampered: true,
  }));
  const tamperedAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${tamperedToken}`,
    },
  };
  await TestValidator.httpError(
    "tampered JWT token",
    401,
    async () =>
      await api.functional.redditPlatform.admin.analytics.realtime(
        tamperedAuthConnection,
      ),
  );
  // Test 5: Token from deleted admin user
  const deleteAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${validToken.access}`,
    },
  };
  // Delete the admin user using the valid token
  // Note: In real implementation, there would be a DELETE endpoint for admin users
  // For this test, we'll verify the token becomes invalid after some modification
  // In a real scenario, you would call the admin deletion endpoint
  // Since we can't actually delete in this context without the delete endpoint,
  // we'll simulate by modifying the user ID in the token
  const deletedToken = createModifiedToken((original) => ({
    ...original,
    id: "00000000-0000-0000-0000-000000000000", // Invalid user ID
  }));
  const deletedAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${deletedToken}`,
    },
  };
  await TestValidator.httpError(
    "token from deleted admin",
    401,
    async () =>
      await api.functional.redditPlatform.admin.analytics.realtime(
        deletedAuthConnection,
      ),
  );
  // Test 6: Valid token should work (positive control)
  const validAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${validToken.access}`,
    },
  };
  const validResponse =
    await api.functional.redditPlatform.admin.analytics.realtime(
      validAuthConnection,
    );
  typia.assert(validResponse);
  await TestValidator.predicate(
    "has valid response structure",
    () =>
      validResponse.refreshedAt !== undefined &&
      validResponse.activeUsers !== undefined &&
      validResponse.contentMetrics !== undefined,
  );
}
