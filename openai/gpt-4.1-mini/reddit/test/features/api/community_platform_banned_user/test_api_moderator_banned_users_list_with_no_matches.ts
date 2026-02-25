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

export async function test_api_moderator_banned_users_list_with_no_matches(
  connection: api.IConnection,
): Promise<void> {
  // Moderator registration and login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // Query banned users with filters that will produce no matches
  const emptyFilter: ICommunityPlatformBannedUser.IRequest = {
    communityPlatformUserId: typia.random<string & tags.Format<"uuid">>(),
    communityPlatformCommunityId: typia.random<string & tags.Format<"uuid">>(),
    isBanned: true,
    bannedAtFrom: new Date().toISOString(),
    bannedAtTo: new Date().toISOString(),
    page: 1,
    limit: 10,
  };
  const bansResult =
    await api.functional.communityPlatform.moderator.banned_users.index(
      moderatorConnection,
      {
        body: emptyFilter,
      },
    );
  typia.assert(bansResult);
  // Validate that data array is empty
  TestValidator.equals("banned users list is empty", bansResult.data.length, 0);
  // Validate pagination info
  const pagination = bansResult.pagination;
  TestValidator.predicate(
    "pagination current is valid",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is valid", pagination.limit === 10);
  // Since no banned users match, total records and pages should be 0
  TestValidator.equals("pagination records is 0", pagination.records, 0);
  TestValidator.equals("pagination pages is 0", pagination.pages, 0);
  // Authorization checks
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access forbidden",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.index(
        unauthorizedConnection,
        {
          body: emptyFilter,
        },
      );
    },
  );
}
