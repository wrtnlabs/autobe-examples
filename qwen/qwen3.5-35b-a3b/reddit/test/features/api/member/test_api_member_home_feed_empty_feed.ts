import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_home_feed_empty_feed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (no subscriptions will be created)
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(joined);
  // 2. Create authenticated connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = joined.token.access;
  // 3. Call home feed endpoint with default request (no subscriptions)
  const feed = await api.functional.redditCommunity.member.home_feed.index(
    memberConnection,
    {
      body: {} satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // 4. Validate empty feed response structure
  TestValidator.equals("pagination current page", feed.pagination.current, 1);
  TestValidator.equals("pagination default limit", feed.pagination.limit, 20);
  TestValidator.equals("pagination records count", feed.pagination.records, 0);
  TestValidator.equals("pagination total pages", feed.pagination.pages, 0);
  TestValidator.equals("empty data array", feed.data, []);
}
