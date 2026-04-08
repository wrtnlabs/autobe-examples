import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscribed_communities_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Call endpoint with member's userId to get subscribed communities
  //    (member has no subscriptions)
  const communities =
    await api.functional.redditPlatform.member.users.subscribed_communities.index(
      memberConnection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(communities);
  // 3. Validate empty response structure
  TestValidator.equals(
    "pagination current page",
    communities.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", communities.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    communities.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    communities.pagination.pages,
    0,
  );
  TestValidator.equals("empty communities array", communities.data, []);
}
