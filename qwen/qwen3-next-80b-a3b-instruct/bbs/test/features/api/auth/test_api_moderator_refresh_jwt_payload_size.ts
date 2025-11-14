import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_jwt_payload_size(
  connection: api.IConnection,
) {
  const refreshToken: string = `refresh_${typia.random<string & tags.Format<"uuid">>()}`;

  const authorized: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(authorized);

  const accessTokenLength = authorized.token.access.length;
  TestValidator.predicate(
    "access token length does not exceed 5500 characters",
    accessTokenLength <= 5500,
  );
}
