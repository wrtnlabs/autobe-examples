import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_banned_users_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to delete a banned user without moderator authorization.
  // We do NOT authorize a moderator (no join), and attempt the deletion.
  // We expect the call to fail with HTTP 401 Unauthorized or 403 Forbidden error.
  const baseConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for banned user id to delete
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // The eraseBannedUser endpoint requires moderator authorization - here we deliberately omit it.
  // Thus, the call is made with baseConnection which has no Authorization header.
  await TestValidator.httpError(
    "unauthorized delete banned user",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.eraseBannedUser(
        baseConnection,
        { id: bannedUserId },
      );
    },
  );
}
