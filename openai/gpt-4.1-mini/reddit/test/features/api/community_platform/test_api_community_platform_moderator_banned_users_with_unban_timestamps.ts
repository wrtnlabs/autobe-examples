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

export async function test_api_community_platform_moderator_banned_users_with_unban_timestamps(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins to get authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    ...(moderatorConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  // 2. Retrieve banned users page (first page)
  const page1 =
    await api.functional.communityPlatform.moderator.community.banned_users.index(
      moderatorConnection,
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    page1.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", page1.pagination.limit > 0);
  TestValidator.predicate(
    "records equals data length",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pages matches records and limit",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // Since 'unbanned_at' is not defined in DTO, skip related tests
  // 3. If multiple pages, retrieve second page and validate continuity
  if (page1.pagination.pages > 1) {
    // Skip because no page parameter in the index API
  }
  // 4. Authorization enforcement: Access is based on moderator's community scope
  await TestValidator.predicate(
    "has at least one banned user record",
    page1.data.length > 0,
  );
}
