import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_moderator_detailed_info_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator joins to create a new moderator user and authenticate
  const moderatorJoinBody = {
    email: `mod${Date.now()}@example.com`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityModerator.IJoin;

  const authorizedModerator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(authorizedModerator);

  // 2. Create a reddit community user that links with the moderator
  // (the relation is via user_id property)
  const userCreateBody = {
    email: `user${Date.now()}@example.com`,
    password: "UserP@ss1234",
    ip: null,
    href: "https://example.com/user",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityUser.ICreate;

  const createdUser: IRedditCommunityUser =
    await api.functional.redditCommunity.users.create(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  // 3. Fetch the moderator detailed info by own moderatorId
  const moderatorDetail: IRedditCommunityModerator =
    await api.functional.redditCommunity.moderator.moderators.at(connection, {
      moderatorId: authorizedModerator.id,
    });
  typia.assert(moderatorDetail);

  // Validate the fetched moderator matches the authorized one
  TestValidator.equals(
    "fetched moderator id matches authorized",
    moderatorDetail.id,
    authorizedModerator.id,
  );
  TestValidator.equals(
    "fetched moderator user_id matches authorized",
    moderatorDetail.user_id,
    authorizedModerator.user_id,
  );
}
