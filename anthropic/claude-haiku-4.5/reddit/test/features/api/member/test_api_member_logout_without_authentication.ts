import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_logout_without_authentication(
  connection: api.IConnection,
) {
  // Create unauthenticated connection by removing authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to logout without authentication
  await TestValidator.error(
    "logout without authentication should fail",
    async () => {
      await api.functional.communityPlatform.member.auth.member.logout(
        unauthConn,
      );
    },
  );
}
