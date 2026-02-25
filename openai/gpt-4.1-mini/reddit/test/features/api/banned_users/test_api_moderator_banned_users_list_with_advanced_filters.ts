import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function test_api_moderator_banned_users_list_with_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  // Description: Test applying advanced filters when retrieving banned users list with filtering and pagination.
  // 1. Moderator join and authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinOutput = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        username: RandomGenerator.name(),
        displayName: null,
        bio: null,
        avatarUrl: null,
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  // set authorization token header
  moderatorConnection.headers = moderatorConnection.headers ?? {};
  moderatorConnection.headers.Authorization = `Bearer ${moderatorJoinOutput.token.access}`;
  // 2. Prepare banned users filter test data
  // Create sample data with various banned user records to test filtering
  // But since no creation utility, we assume we query existing data with filters
  // We test filters using random UUIDs and date ranges, expecting empty or filtered results
  const fakeUserId = typia.random<string & typia.tags.Format<"uuid">>();
  const fakeCommunityId = typia.random<string & typia.tags.Format<"uuid">>();
  // Use date ranges for bannedAtFrom and bannedAtTo
  const now = new Date();
  const bannedAtFrom = new Date(
    now.getTime() - 1000 * 3600 * 24 * 30,
  ).toISOString(); // 30 days ago
  const bannedAtTo = now.toISOString();
  // 3. Execute API call with advanced filters and validate
  const requestBody: ICommunityPlatformBannedUser.IRequest = {
    communityPlatformUserId: fakeUserId,
    communityPlatformCommunityId: fakeCommunityId,
    isBanned: true,
    bannedAtFrom: bannedAtFrom,
    bannedAtTo: bannedAtTo,
    page: 1,
    limit: 10,
  };
  const output =
    await api.functional.communityPlatform.moderator.banned_users.index(
      moderatorConnection,
      { body: requestBody },
    );
  typia.assert(output);
  // 4. Verify all returned records match the filter criteria
  for (const bannedUser of output.data) {
    // Assert ban status
    TestValidator.predicate(
      `banned user ${bannedUser.id} is currently banned`,
      bannedUser.unbannedAt === null || bannedUser.unbannedAt === undefined,
    );
    // Assert userId filter
    TestValidator.equals(
      `banned user ${bannedUser.id} user ID matches filter`,
      bannedUser.user.id,
      fakeUserId,
    );
    // Assert communityId filter
    TestValidator.equals(
      `banned user ${bannedUser.id} community ID matches filter`,
      bannedUser.community.id,
      fakeCommunityId,
    );
    // Assert bannedAt within range
    TestValidator.predicate(
      `banned user ${bannedUser.id} bannedAt >= bannedAtFrom`,
      new Date(bannedUser.bannedAt) >= new Date(bannedAtFrom),
    );
    TestValidator.predicate(
      `banned user ${bannedUser.id} bannedAt <= bannedAtTo`,
      new Date(bannedUser.bannedAt) <= new Date(bannedAtTo),
    );
  }
  // 5. Test pagination behavior
  // If there are more records, test that pagination limits data count
  TestValidator.predicate(
    "pagination data count <= limit",
    output.data.length <= requestBody.limit!,
  );
  // If pagination is present, page is correct
  TestValidator.equals(
    "pagination current page",
    output.pagination.current,
    requestBody.page!,
  );
  // 6. Negative case: unauthorized access (no token) must fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.communityPlatform.moderator.banned_users.index(
      unauthorizedConnection,
      { body: requestBody },
    );
  });
}
