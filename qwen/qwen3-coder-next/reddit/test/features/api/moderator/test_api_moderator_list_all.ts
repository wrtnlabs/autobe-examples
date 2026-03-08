import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderator_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberAccount);
  // Setup: Create community for testing
  const communityName = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName,
      },
    );
  typia.assert(subscription);
  // Exercise: List moderators for the community
  const moderators =
    await api.functional.redditLike.communities.moderators.index(
      memberConnection,
      {
        communityName,
        body: {
          limit: 10,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(moderators);
  // Verify: Response structure is correct
  typia.assert(moderators);
  TestValidator.predicate("pagination exists", moderators.pagination !== null);
  TestValidator.predicate("data array exists", Array.isArray(moderators.data));
}
