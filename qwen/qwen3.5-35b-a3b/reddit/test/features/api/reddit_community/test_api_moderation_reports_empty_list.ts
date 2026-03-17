import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderation_reports_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account and authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<'uri'>>(),
      referrer: typia.random<string & tags.Format<'uri'>>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create moderator-specific connection
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Query moderation reports (no reports exist yet)
  const reportsResponse =
    await api.functional.redditCommunity.member.moderation.reports.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(reportsResponse);
  // 4. Validate response structure with empty data
  TestValidator.equals("empty reports data array", reportsResponse.data, []);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    reportsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    reportsResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records count",
    reportsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages",
    reportsResponse.pagination.pages,
    0,
  );
}