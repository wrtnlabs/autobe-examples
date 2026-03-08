import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authorized connection with token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 3. Subscribe to multiple communities
  const communities = ["typescript", "javascript", "nodejs"] as const;
  const subscriptions: IRedditLikeSubscription.ISummary[] = [];
  for (const communityName of communities) {
    const subscription =
      await api.functional.redditLike.member.communities.subscribe.create(
        memberAuthConnection,
        { communityName },
      );
    typia.assert(subscription);
    subscriptions.push(subscription);
  }
  // 4. Test default pagination
  const defaultResponse =
    await api.functional.redditLike.member.subscriptions.index(
      memberAuthConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "pagination structure correct",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit matches", defaultResponse.pagination.limit, 20);
  TestValidator.equals(
    "records count matches",
    defaultResponse.pagination.records,
    subscriptions.length,
  );
  TestValidator.equals(
    "pages count correct",
    defaultResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "data array length",
    defaultResponse.data.length,
    subscriptions.length,
  );
  // 5. Validate subscription data
  for (const subscription of defaultResponse.data) {
    TestValidator.equals(
      "status is subscribed",
      subscription.status,
      "subscribed",
    );
    TestValidator.equals(
      "member ID matches",
      subscription.member.id,
      member.id,
    );
    TestValidator.predicate("community has required fields", () => {
      const c = subscription.community;
      return (
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        typeof c.created_at === "string"
      );
    });
  }
  // 6. Test pagination boundaries with limit=1
  const limitOneResponse =
    await api.functional.redditLike.member.subscriptions.index(
      memberAuthConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(limitOneResponse);
  TestValidator.equals(
    "limit=1 returns one item",
    limitOneResponse.pagination.limit,
    1,
  );
  TestValidator.equals("limit=1 data length", limitOneResponse.data.length, 1);
  TestValidator.equals(
    "records unchanged",
    limitOneResponse.pagination.records,
    subscriptions.length,
  );
  TestValidator.predicate("pages computed correctly", () => {
    return limitOneResponse.pagination.pages >= 1;
  });
}
