import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";

export async function test_api_admin_search_invalid_request_body(
  connection: api.IConnection,
) {
  // Test that server rejects malformed JSON syntax in search request body
  await TestValidator.error(
    "search request should reject malformed JSON syntax",
    async () => {
      await api.functional.communityPlatform.admin.admins.index(connection, {
        body: '{"page":}', // Malformed JSON: missing value after colon — causes server JSON parsing failure
      });
    },
  );
}
