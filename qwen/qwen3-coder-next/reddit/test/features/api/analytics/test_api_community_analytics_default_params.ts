import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_analytics_default_params(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Query community analytics with default parameters (empty object for optional fields)
  const output: IPageIRedditCloneCommunity.IStatistic =
    await api.functional.redditClone.member.analytics.communities.statistics.index(
      memberConnection,
      {
        body: {
          search: undefined,
          minSubscribers: undefined,
          maxSubscribers: undefined,
          minPosts: undefined,
          minComments: undefined,
          minVotes: undefined,
          timeRange: undefined,
          sortBy: undefined,
          sortOrder: undefined,
          page: undefined,
          limit: undefined,
        } satisfies IRedditCloneCommunity.IAnalyticsRequest,
      },
    );
  typia.assert(output);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "has pagination object",
    output.pagination !== undefined,
  );
  TestValidator.predicate(
    "has current page",
    typeof output.pagination.current === "number",
  );
  TestValidator.predicate(
    "has limit",
    typeof output.pagination.limit === "number",
  );
  TestValidator.predicate(
    "has records",
    typeof output.pagination.records === "number",
  );
  TestValidator.predicate(
    "has pages",
    typeof output.pagination.pages === "number",
  );
  // 4. Validate data array exists
  TestValidator.predicate("has data array", Array.isArray(output.data));
}
