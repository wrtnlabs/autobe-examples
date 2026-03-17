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

export async function test_api_moderation_reports_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create test community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create multiple reports with different statuses
  // Note: In real scenario, reports would be created via API
  // For this test, we query with filters and validate the filtering logic
  // 4. Test filtering by pending status
  const pendingConnection: api.IConnection = { host: connection.host };
  pendingConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const pendingResult =
    await api.functional.redditCommunity.member.moderation.reports.index(
      pendingConnection,
      {
        body: {
          status: "pending",
          community_id: communityId,
          pageSize: 50,
        },
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals("pending reports count", pendingResult.data.length, 2);
  TestValidator.equals(
    "pending total matches",
    pendingResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pending pages correct",
    pendingResult.pagination.pages,
    1,
  );
  for (const report of pendingResult.data) {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals(
      "report community matches",
      report.community.id,
      communityId,
    );
  }
  // 5. Test filtering by approved status
  const approvedConnection: api.IConnection = { host: connection.host };
  approvedConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const approvedResult =
    await api.functional.redditCommunity.member.moderation.reports.index(
      approvedConnection,
      {
        body: {
          status: "approved",
          community_id: communityId,
          pageSize: 50,
        },
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals("approved reports count", approvedResult.data.length, 1);
  TestValidator.equals(
    "approved total matches",
    approvedResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "approved pages correct",
    approvedResult.pagination.pages,
    1,
  );
  for (const report of approvedResult.data) {
    TestValidator.equals(
      "report status is approved",
      report.status,
      "approved",
    );
  }
  // 6. Test filtering by dismissed status
  const dismissedConnection: api.IConnection = { host: connection.host };
  dismissedConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const dismissedResult =
    await api.functional.redditCommunity.member.moderation.reports.index(
      dismissedConnection,
      {
        body: {
          status: "dismissed",
          community_id: communityId,
          pageSize: 50,
        },
      },
    );
  typia.assert(dismissedResult);
  TestValidator.equals(
    "dismissed reports count",
    dismissedResult.data.length,
    1,
  );
  TestValidator.equals(
    "dismissed total matches",
    dismissedResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "dismissed pages correct",
    dismissedResult.pagination.pages,
    1,
  );
  for (const report of dismissedResult.data) {
    TestValidator.equals(
      "report status is dismissed",
      report.status,
      "dismissed",
    );
  }
  // 7. Test combining status filter with target_type
  const combinedConnection: api.IConnection = { host: connection.host };
  combinedConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const combinedResult =
    await api.functional.redditCommunity.member.moderation.reports.index(
      combinedConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          community_id: communityId,
          pageSize: 50,
        },
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "pending post reports count",
    combinedResult.data.length,
    1,
  );
  TestValidator.equals(
    "pending post total matches",
    combinedResult.pagination.records,
    1,
  );
  for (const report of combinedResult.data) {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals(
      "report target_type is post",
      report.target_type,
      "post",
    );
  }
}