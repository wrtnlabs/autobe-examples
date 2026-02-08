import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_moderator_banned_users_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join to get authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    });
  // Set authorization header for subsequent requests
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // 2. Call banned users index endpoint using authorized moderator connection
  const output: IPageICommunityPlatformBannedUser.ISummary =
    await api.functional.communityPlatform.moderator.community.banned_users.index(
      moderatorConnection,
    );
  // 3. Assert output shape
  typia.assert(output);
  // 4. Validate that data is empty since no banned users exist
  TestValidator.equals("banned users data length", output.data.length, 0);
  // 5. Validate pagination metadata correctness
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 0);
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
  // 6. Check unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to banned users list",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.community.banned_users.index(
        unauthorizedConnection,
      );
    },
  );
}
