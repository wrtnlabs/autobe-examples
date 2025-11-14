import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_has_no_digital_signature_bypass(
  connection: api.IConnection,
) {
  const invalidRefreshToken =
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIiwia2lkIjoiZmFrZS1raWQifQ.eyJzdWIiOiJmYWNlLWlkIiwiZXhwIjoxNzAwMDAwMDAwLCJpYXQiOjE2OTk5OTk5OTl9.fakesignature";

  await TestValidator.error(
    "refresh with forged JWT signature should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
