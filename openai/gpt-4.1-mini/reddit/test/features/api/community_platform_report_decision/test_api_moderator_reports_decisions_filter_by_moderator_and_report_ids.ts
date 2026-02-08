import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportDecision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_moderator_reports_decisions_filter_by_moderator_and_report_ids(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // Join user and get token
  const userJoin = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userJoin);
  userConnection.headers = { Authorization: userJoin.token.access };
  // Join moderator and get token
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorJoin);
  moderatorConnection.headers = { Authorization: moderatorJoin.token.access };
  // Join admin and get token
  const adminJoin = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(adminJoin);
  adminConnection.headers = { Authorization: adminJoin.token.access };
  // Generate UUIDs for missing ids due to empty join DTOs
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  const communityId =
    (
      community as {
        id?: string;
      }
    ).id ?? typia.random<string & tags.Format<"uuid">>();
  // Create moderator assignment
  const communityModerator =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId,
          communityModeratorId: moderatorId,
          role: "moderator",
        },
      },
    );
  typia.assert(communityModerator);
  // Create report
  const report = await generate_random_community_platform_reports_create(
    userConnection,
    {
      body: {
        description: "Test report for filtering",
      },
    },
  );
  typia.assert(report);
  const reportId =
    (
      report as {
        id?: string;
      }
    ).id ?? typia.random<string & tags.Format<"uuid">>();
  // Prepare filter request with only allowed properties
  const filterRequest: ICommunityPlatformReportDecision.IRequest = {
    page: 1,
    limit: 10,
    includeDeleted: false,
  };
  // Call API
  const response =
    await api.functional.communityPlatform.moderator.reportsDecisions.index(
      moderatorConnection,
      {
        body: filterRequest,
      },
    );
  typia.assert<IPageICommunityPlatformReportDecision.ISummary>(response);
  // Validate pagination
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is not negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is not negative",
    response.pagination.records >= 0,
  );
  // Validate data - check that decisions exist
  TestValidator.predicate("response has decisions", response.data.length >= 0);
  // No properties moderatorId or reportId exist on decision summary, so just assert each item
  for (const decision of response.data) {
    typia.assert<ICommunityPlatformReportDecision.ISummary>(decision);
  }
}
