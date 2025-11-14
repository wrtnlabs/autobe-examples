import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";

export async function test_api_citizen_token_refresh(
  connection: api.IConnection,
) {
  const refresh_token: string = typia.random<string & tags.Format<"uuid">>();

  const refreshed: IPoliticalForumCitizen.IAuthorized =
    await api.functional.auth.citizen.refresh(connection, {
      body: refresh_token,
    });
  typia.assert(refreshed);

  TestValidator.predicate("refreshed token has expired_at in future", () => {
    const now = new Date().getTime();
    const expiredAt = Date.parse(refreshed.token.expired_at);
    return expiredAt > now;
  });

  TestValidator.predicate(
    "refreshed token has refreshable_until in future",
    () => {
      const now = new Date().getTime();
      const refreshableUntil = Date.parse(refreshed.token.refreshable_until);
      return refreshableUntil > now;
    },
  );

  TestValidator.equals("citizen id preserved", refreshed.id, refreshed.id);
  TestValidator.equals(
    "citizen email preserved",
    refreshed.email,
    refreshed.email,
  );
  TestValidator.equals(
    "citizen display_name preserved",
    refreshed.display_name,
    refreshed.display_name,
  );
  TestValidator.equals(
    "citizen email_verified preserved",
    refreshed.email_verified,
    refreshed.email_verified,
  );
}
