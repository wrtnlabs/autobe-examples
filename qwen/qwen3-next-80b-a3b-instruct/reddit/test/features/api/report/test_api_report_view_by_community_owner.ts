import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_report_view_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin account for setup
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdminPassword = RandomGenerator.alphaNumeric(16);
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: platformAdminPassword,
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(platformAdmin);
  // Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwnerPassword = RandomGenerator.alphaNumeric(16);
  const communityOwner = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: communityOwnerPassword,
        displayName: RandomGenerator.name(),
      },
    },
  );
  typia.assert(communityOwner);
  // Login as community owner to access reports via platformAdmin endpoint
  const reportViewConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(reportViewConnection, {
    body: {
      email: communityOwner.email,
      password: communityOwnerPassword,
    },
  });
  // Generate a fake report ID for testing (scenario allows inheritance via authorization)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Test: community owner can view the report via platformAdmin endpoint
  const reportViewResult =
    await api.functional.redditCommunity.platformAdmin.reports.at(
      reportViewConnection,
      {
        reportId,
      },
    );
  typia.assert(reportViewResult);
  // Validate report structure
  TestValidator.equals("report id matches", reportViewResult.id, reportId);
  TestValidator.predicate(
    "report has reporter",
    reportViewResult.reporter !== null,
  );
  TestValidator.predicate(
    "report has target",
    reportViewResult.target !== null,
  );
  TestValidator.equals(
    "resolved_by_user is null (pending)",
    reportViewResult.resolved_by_user,
    null,
  );
  TestValidator.equals(
    "report status is pending",
    reportViewResult.status,
    "pending",
  );
}
