import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

export async function test_api_community_home_feed_pagination(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: typia.random<ICommunityPlatformMember.IJoin>(),
    });
  // 2. Get home feed (first page)
  const firstPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.feeds.at(memberConnection);
  typia.assert(firstPage);
  // 3. Verify pagination structure exists
  TestValidator.equals("Pagination exists", !!firstPage.pagination, true);
  TestValidator.equals("Has data", firstPage.data.length > 0, true);
  // 4. Verify if there are more pages to fetch
  if (firstPage.pagination.pages > 1) {
    // Get next page
    const nextPage: IPageICommunityPlatformPost.ISummary =
      await api.functional.communityPlatform.member.feeds.at(memberConnection);
    typia.assert(nextPage);
    TestValidator.equals("Next page has data", nextPage.data.length > 0, true);
  }
}
