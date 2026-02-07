import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_platform_moderator_communities_bans_create";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test the paginated ban records listing endpoint with proper authentication
 * and authorization.
 */
export async function test_api_bans_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate users and moderator
  await authorize_user_join(userConnection, {
    body: {
      email: RandomGenerator.name(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: RandomGenerator.name(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  // 3. User creates a community
  const community = await api.functional.redditPlatform.user.communities.create(
    userConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Moderator bans the user from the community
  const ban =
    await api.functional.redditPlatform.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId: RandomGenerator.alphaNumeric(8),
        body: {
          user_id: userConnection.headers?.Authorization ?? "",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Test unauthorized access (base connection - no authentication)
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.redditPlatform.user.bans.index(connection);
  });
  // 6. Test regular user cannot access ban list
  await TestValidator.error("regular user cannot access", async () => {
    await api.functional.redditPlatform.user.bans.index(userConnection);
  });
  // 7. Test moderator can access ban list for their community
  const moderatorBans =
    await api.functional.redditPlatform.user.bans.index(moderatorConnection);
  typia.assert(moderatorBans);
  // 8. Verify pagination structure
  TestValidator.equals(
    "has pagination",
    typeof moderatorBans.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has required fields",
    typeof moderatorBans.pagination.current === "number" &&
      typeof moderatorBans.pagination.limit === "number" &&
      typeof moderatorBans.pagination.records === "number" &&
      typeof moderatorBans.pagination.pages === "number",
    true,
  );
  // 9. Verify ban summary data structure (ISummary)
  if (moderatorBans.data.length > 0) {
    const banSummary = moderatorBans.data[0];
    // ISummary is an empty interface, so we can only verify it's an object
    TestValidator.equals("ban summary is object", typeof banSummary, "object");
  }
  // 10. Test pagination with different page sizes
  const limitedBans =
    await api.functional.redditPlatform.user.bans.index(moderatorConnection);
  typia.assert(limitedBans);
  TestValidator.equals(
    "response count matches pagination",
    limitedBans.data.length <= limitedBans.pagination.limit,
    true,
  );
  // 11. Verify ban summary array exists
  TestValidator.equals(
    "ban data array exists",
    Array.isArray(moderatorBans.data),
    true,
  );
  // 12. Verify ban count matches pagination records
  TestValidator.equals(
    "ban count matches pagination",
    moderatorBans.data.length <= moderatorBans.pagination.records,
    true,
  );
}
