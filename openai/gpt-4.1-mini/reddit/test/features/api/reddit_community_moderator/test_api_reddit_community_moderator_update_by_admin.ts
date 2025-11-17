import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_reddit_community_moderator_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (authenticates) to obtain authorization token
  const adminJoinBody = {
    email: `admin${Date.now()}@example.com`,
    password: "AdminPass123!",
    href: "https://admin.portal.local/join",
    referrer: "https://admin.portal.local/",
  } satisfies IRedditCommunityAdmin.IJoin;
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Create a reddit community moderator account
  const modCreateBody = {
    email: `moderator${Date.now()}@example.com`,
    password: "ModPass123!",
  } satisfies IRedditCommunityModerator.ICreate;
  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      { body: modCreateBody },
    );
  typia.assert(moderator);

  // 3. Update moderator's email by admin
  const newEmail = `mod_updated${Date.now()}@example.com`;
  const modUpdateBody = {
    email: newEmail,
  } satisfies IRedditCommunityModerator.IUpdate;
  const updatedModerator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.update(
      connection,
      { id: moderator.id, body: modUpdateBody },
    );
  typia.assert(updatedModerator);

  // Validate updated email
  TestValidator.equals(
    "moderator updated email matches",
    updatedModerator.email,
    newEmail,
  );
  // Validate id unchanged
  TestValidator.equals(
    "moderator id remains after update",
    updatedModerator.id,
    moderator.id,
  );
}
