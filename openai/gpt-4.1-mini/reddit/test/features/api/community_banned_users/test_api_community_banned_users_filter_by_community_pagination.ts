import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_banned_users_filter_by_community_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join & authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {
      // No fields required, so empty body
    },
  });
  typia.assert(moderatorJoin);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorJoin.token.access;
  // 2. Prepare pagination parameters
  // As the request DTO is empty, we can try with empty filter and pagination in body
  // We need to test pagination, so let's do call with empty body
  // Call API and validate
  const requestBody: ICommunityPlatformCommunityBannedUser.IRequest = {};
  const response =
    await api.functional.communityPlatform.moderator.community_banned_users.index(
      moderatorConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Ensure pagination metadata exists
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // If there is at least one banned user, validate structure of first element
  if (response.data.length > 0) {
    const bannedUser = response.data[0];
    // Validate ban reason and timestamps - these properties must exist if available
    // Since schema is not detailed here, we just validate existence of properties and their types if available
    // Assume that ban reason and timestamps are string or nullable
    // They should be string (likely date-time) or null
    if ("ban_reason" in bannedUser) {
      TestValidator.predicate(
        "ban reason is string or null",
        bannedUser.ban_reason === null ||
          typeof bannedUser.ban_reason === "string",
      );
    }
    if ("banned_at" in bannedUser) {
      TestValidator.predicate(
        "banned_at is string or null",
        bannedUser.banned_at === null ||
          typeof bannedUser.banned_at === "string",
      );
    }
    if ("unbanned_at" in bannedUser) {
      TestValidator.predicate(
        "unbanned_at is string or null",
        bannedUser.unbanned_at === null ||
          typeof bannedUser.unbanned_at === "string",
      );
    }
    // Related user and community info exist
    if ("user" in bannedUser) {
      TestValidator.predicate(
        "user is object",
        typeof bannedUser.user === "object" && bannedUser.user !== null,
      );
    }
    if ("community" in bannedUser) {
      TestValidator.predicate(
        "community is object",
        typeof bannedUser.community === "object" &&
          bannedUser.community !== null,
      );
    }
  }
  // All calls must be authorized; unauthorized access test
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", [401, 403], async () => {
    await api.functional.communityPlatform.moderator.community_banned_users.index(
      unauthorizedConnection,
      {
        body: requestBody,
      },
    );
  });
}
