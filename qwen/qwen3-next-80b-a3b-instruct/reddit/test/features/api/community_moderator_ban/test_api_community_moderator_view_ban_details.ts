import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_view_ban_details(
  connection: api.IConnection,
): Promise<void> {
  // Create an authorized community moderator
  const authorizedModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const authorizedModerator = await authorize_community_moderator_join(
    authorizedModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(authorizedModerator);
  // Generate a random ban ID that does not exist
  const nonExistentBanId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Try to view a non-existent ban as authorized moderator: should return 404
  await TestValidator.httpError(
    "should return 404 for non-existent ban",
    404,
    async () => {
      await api.functional.redditCommunity.communityModerator.bans.at(
        authorizedModeratorConnection,
        {
          banId: nonExistentBanId,
        },
      );
    },
  );
  // Create an unauthorized community moderator (different user)
  const unauthorizedModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedModerator = await authorize_community_moderator_join(
    unauthorizedModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(unauthorizedModerator);
  // Try to view the same non-existent ban with unauthorized moderator: should return 403
  await TestValidator.httpError(
    "should return 403 for unauthorized access",
    403,
    async () => {
      await api.functional.redditCommunity.communityModerator.bans.at(
        unauthorizedModeratorConnection,
        {
          banId: nonExistentBanId,
        },
      );
    },
  );
}
