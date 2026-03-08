import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_list_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member actor
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember: IRedditLikeMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    });
  const ownerMemberConnection: api.IConnection = { host: connection.host };
  ownerMemberConnection.headers = { Authorization: ownerMember.token.access };
  // 2. Create moderator member actor
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember: IRedditLikeMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    });
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  moderatorMemberConnection.headers = {
    Authorization: moderatorMember.token.access,
  };
  // 3. Create a community name for testing
  const communityName = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  // 4. Add first moderator to community using owner credentials
  const moderatorRole1 =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerMemberConnection,
      {
        params: { communityName },
        body: {
          user_id: ownerMember.id,
          community_id: "00000000-0000-0000-0000-000000000001",
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(moderatorRole1);
  // 5. Add second moderator to community
  const moderatorRole2 =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerMemberConnection,
      {
        params: { communityName },
        body: {
          user_id: moderatorMember.id,
          community_id: "00000000-0000-0000-0000-000000000001",
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(moderatorRole2);
  // 6. List all moderators for the community
  const allModerators =
    await api.functional.redditLike.communities.moderators.index(
      ownerMemberConnection,
      {
        communityName,
        body: { limit: 100 } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(allModerators);
  // 7. Validate moderator roles exist by filtering
  const moderatorList = allModerators.data.filter(
    (m) => m.role === "moderator",
  );
  TestValidator.predicate("has moderator", moderatorList.length > 0);
  TestValidator.equals("moderator count", moderatorList.length, 2);
}
