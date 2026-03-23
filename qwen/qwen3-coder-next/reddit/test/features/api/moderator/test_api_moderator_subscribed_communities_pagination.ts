import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IPageIRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_moderator_subscribed_communities_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator and join as member for community creation
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Login as moderator to create communities
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorAuthConnection, {
    body: {
      email: moderator.email,
      password: "1234",
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 3. Create 15 communities as the moderator
  const communities: IRedditLikeCommunity[] = [];
  await ArrayUtil.asyncRepeat(15, async (i) => {
    const community = await api.functional.redditLike.member.communities.create(
      moderatorAuthConnection,
      {
        body: {
          name: `testcommunity${i}`,
          icon_url: undefined,
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
    typia.assert(community);
    communities.push(community);
  });
  // 4. Login as member and subscribe to all communities
  const memberAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAuthConnection, {
    body: {
      email: member.email,
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  // Subscribe to all communities
  for (const community of communities) {
    await api.functional.redditLike.member.subscriptions.index(
      memberAuthConnection,
      {
        body: {
          status: "subscribed",
          communityName: community.name,
          offset: 0,
          limit: 1,
          page: 1,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  }
  // 5. Call endpoint with limit=5 to test pagination
  const response =
    await api.functional.redditLike.moderator.communities.my.index(
      memberAuthConnection,
    );
  typia.assert(response);
  // 6. Verify pagination metadata for first page (limit=5)
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 5", response.pagination.limit, 5);
  TestValidator.equals("total records is 15", response.pagination.records, 15);
  TestValidator.equals("total pages is 3", response.pagination.pages, 3);
  TestValidator.equals("first page has 5 items", response.data.length, 5);
  // 7. Call with page=2 to verify offset pagination
  const page2 =
    await api.functional.redditLike.moderator.communities.my.index(
      memberAuthConnection,
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 has correct offset",
    page2.pagination.current,
    2,
  );
  // 8. Verify last page has remaining items
  const lastPage =
    await api.functional.redditLike.moderator.communities.my.index(
      memberAuthConnection,
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page has remaining items",
    lastPage.data.length,
    5,
  );
}
