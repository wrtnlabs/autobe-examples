import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_expired_token(
  connection: api.IConnection,
) {
  // Generate a refresh token with an expiration in the past to simulate an expired token
  const expiredTime = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
  const refreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2RlcmF0b3JAZW1haWwuZXhhbXBsZS5jb20iLCJpYXQiOjE2OTg3NjU0MjIsImV4cCI6MTY5ODg1MTgyMiwiaXNzIjoiY29tbXVuaXR5QkJTIiwicmVmcmVzaGFibGVfdW50aWwiOiIyMDI1LTExLTE5VDA4OjE5OjA5LjI3NFoifQ.0gDZbFfQI2DO5KET1m2ZJ77qBYeCBIXggALaCHfW5MA";

  // Attempt to refresh with an expired refresh token, expecting a 401 Unauthorized error
  await TestValidator.error(
    "refreshing with expired token should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: refreshToken,
      });
    },
  );
}
