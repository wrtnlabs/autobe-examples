import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_assignments_retrieval_by_self(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new community moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await authorize_community_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: (() => {
          let password = RandomGenerator.alphaNumeric(16);
          // Ensure contains at least one digit
          if (!/[0-9]/.test(password)) password = password.replace(/\D/, "1");
          // Ensure contains at least one special character
          if (!/[!@#$%^&*]/.test(password))
            password = password.replace(/[^0-9a-zA-Z]/, "!");
          return password;
        })(),
        username: RandomGenerator.name(1),
      },
    });
  typia.assert(moderator);
  // Step 2: Use the moderator's connection to retrieve their assigned communities
  const response: IPageIRedditCommunityModerator.ISummary =
    await api.functional.redditCommunity.communityModerator.moderators.index(
      moderatorConnection,
      {
        userId: moderator.id,
      },
    );
  typia.assert(response);
  // Step 3: Validate basic response structure (after typia.assert)
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
}
