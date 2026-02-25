import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_report_view_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a platform admin user for report management
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(platformAdmin);
  // 2. Create a community moderator who will be assigned to a community
  const communityModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const communityModerator = await authorize_community_moderator_join(
    communityModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(communityModerator);
  // 3. Create a regular user who will be the reporter
  const regularUserConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_community_moderator_join(
    regularUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(regularUser);
  // 4. Since the API does not provide an endpoint to create posts directly,
  // and we cannot test the creation of a report (no POST endpoint exists),
  // we simulate a report object following the IRedditCommunityReport structure.
  // This is necessary to test the view permission logic for the GET endpoint.
  // The report object mimics a real report with a post target belonging to the community
  // the moderator is assigned to.
  const report: IRedditCommunityReport = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reporter: {
      id: regularUser.id,
      username: regularUser.username,
      display_name: regularUser.display_name,
      bio: regularUser.bio,
      avatar_url: regularUser.avatar_url,
      karma_score: regularUser.karma_score,
      created_at: regularUser.created_at,
    },
    resolved_by_user: null,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    status: "pending" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    target: {
      id: typia.random<string & tags.Format<"uuid">>(), // Simulated post ID
      title: RandomGenerator.paragraph({ sentences: 1 }),
      author: {
        id: regularUser.id,
        username: regularUser.username,
        display_name: regularUser.display_name,
        bio: regularUser.bio,
        avatar_url: regularUser.avatar_url,
        karma_score: regularUser.karma_score,
        created_at: regularUser.created_at,
      },
      community: {
        id: communityModerator.community.id,
        name: communityModerator.community.name,
        description: communityModerator.community.description,
        icon_url: communityModerator.community.icon_url,
        subscriber_count: communityModerator.community.subscriber_count,
        created_at: communityModerator.community.created_at,
        updated_at: communityModerator.community.updated_at,
      },
      voteScore: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: undefined,
      imageUrl: undefined,
    },
  };
  // 5. Authenticate the community moderator and verify they can view the report
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(moderatorConnection, {
    body: {
      email: communityModerator.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test the GET endpoint for viewing the report, using the simulated report ID
  const retrievedReport =
    await api.functional.redditCommunity.platformAdmin.reports.at(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // Validate the retrieved report details match our simulation
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "report target is the post",
    retrievedReport.target.id,
    report.target.id,
  );
  TestValidator.equals(
    "report reporter is the regular user",
    retrievedReport.reporter.id,
    regularUser.id,
  );
  // 6. Create a second community moderator assigned to a different community
  const secondCommunityModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const secondCommunityModerator = await authorize_community_moderator_join(
    secondCommunityModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(secondCommunityModerator);
  // 7. Verify the second moderator cannot view the report from the first community
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(secondModeratorConnection, {
    body: {
      email: secondCommunityModerator.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await TestValidator.httpError(
    "second moderator cannot view report",
    403,
    async () => {
      await api.functional.redditCommunity.platformAdmin.reports.at(
        secondModeratorConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
  // 8. Verify a regular user cannot view the report
  const originalUserConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(originalUserConnection, {
    body: {
      email: regularUser.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await TestValidator.httpError(
    "regular user cannot view report",
    403,
    async () => {
      await api.functional.redditCommunity.platformAdmin.reports.at(
        originalUserConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
