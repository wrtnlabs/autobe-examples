import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_home_feed_empty_when_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member connection and register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Request the Home Feed with default parameters
  const feed =
    await api.functional.communityPlatform.member.posts.feeds.home.index(
      memberConnection,
      {
        body: {
          feed: "home",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feed);
  // 3. Verify the data array is empty
  TestValidator.equals("data is empty", feed.data, []);
  // 4. Verify pagination metadata
  TestValidator.equals("records equals 0", feed.pagination.records, 0);
  TestValidator.equals("pages equals 0", feed.pagination.pages, 0);
  TestValidator.equals("current equals 1", feed.pagination.current, 1);
  TestValidator.equals("limit equals 20", feed.pagination.limit, 20);
}
