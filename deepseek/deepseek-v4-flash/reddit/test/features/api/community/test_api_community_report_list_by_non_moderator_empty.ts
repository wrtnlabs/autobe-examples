import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_report_list_by_non_moderator_empty(
  connection: api.IConnection,
): Promise<void> {
  // Register a member who has no moderation authority over any community
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Call the community reports endpoint as a non-moderator
  // An empty request body means default pagination (page=1, limit=20, status=pending)
  const page =
    await api.functional.communityPlatform.member.community_reports.index(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformCommunityReport.IRequest,
      },
    );
  typia.assert(page);
  // Assert the page is empty (not an authorization error)
  TestValidator.equals("data is empty array", page.data, []);
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("total records", page.pagination.records, 0);
  TestValidator.equals("total pages", page.pagination.pages, 0);
  TestValidator.equals("page limit", page.pagination.limit, 20);
}
