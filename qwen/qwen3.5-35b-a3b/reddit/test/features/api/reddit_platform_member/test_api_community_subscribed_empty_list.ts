import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_subscribed_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member
  const adminConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create member connection with auth token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = member.token.access;
  // 3. Call subscribed communities endpoint without subscribing to any communities
  const result: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.member.users.me.communities.subscribed.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // 4. Validate response structure
  TestValidator.equals("data is empty array", result.data, []);
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", result.pagination.limit, 20);
  TestValidator.equals("pagination records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", result.pagination.pages, 0);
}
