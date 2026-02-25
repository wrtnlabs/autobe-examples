import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_ban_list_filter_active_status(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Generate random community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Filter by active status only
  const activeBans =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(activeBans);
  // Validate all returned bans are active
  for (const ban of activeBans.data) {
    TestValidator.equals("ban status should be active", ban.status, "active");
    TestValidator.predicate(
      "ban should have user information",
      ban.user !== undefined,
    );
    TestValidator.predicate(
      "ban should have moderator information",
      ban.moderator !== undefined,
    );
    TestValidator.predicate("ban should have reason", ban.reason.length > 0);
  }
  // Test 2: Combine active status with text search
  const searchBans =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "active",
          search: "test",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(searchBans);
  // Test 3: Combine active status with date range
  const dateBans =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "active",
          banned_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          banned_at_end: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(dateBans);
  // Test 4: Empty result case with non-existent search
  const emptyBans =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "active",
          search: "nonexistentsearchterm12345",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(emptyBans);
  TestValidator.equals(
    "empty search should return empty data",
    emptyBans.data.length,
    0,
  );
}
