import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_view_user_no_bans(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: (() => {
          let password = RandomGenerator.alphaNumeric(16);
          if (!/[0-9]/.test(password)) password = password.replace(/\D/, "1");
          if (!/[!@#$%^&*]/.test(password))
            password = password.replace(/[^0-9a-zA-Z]/, "!");
          return password;
        })(),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // Use the moderator's own user ID -- this user exists in reddit_community_members (as linked in IAuthorized.user)
  // and is not expected to be banned from their own community
  const userId = moderator.user.id;
  // Fetch bans for this un-banned user - should return empty list with valid pagination
  const bansResponse =
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorConnection,
      { userId },
    );
  typia.assert(bansResponse);
  // Validate response structure matches exact requirements
  TestValidator.equals(
    "pagination current",
    bansResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", bansResponse.pagination.limit, 1000);
  TestValidator.equals(
    "pagination records",
    bansResponse.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", bansResponse.pagination.pages, 0);
  TestValidator.equals("data array length", bansResponse.data.length, 0);
}
