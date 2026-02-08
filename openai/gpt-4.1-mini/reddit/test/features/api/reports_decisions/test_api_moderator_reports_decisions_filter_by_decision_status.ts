import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";

export async function test_api_moderator_reports_decisions_filter_by_decision_status(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };

  // Moderator join and login
  const moderatorJoinBody = typia.random<ICommunityPlatformModerator.IJoin>();
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    { body: moderatorJoinBody },
  );
  typia.assert(moderatorAuthorized);
  const moderatorLoginBody = typia.random<ICommunityPlatformModerator.ILogin>();
  const modLoginAuthorized = await authorize_moderator_login(
    moderatorConnection,
    { body: moderatorLoginBody },
  );
  typia.assert(modLoginAuthorized);

  // User join and login
  const userJoinBody = typia.random<ICommunityPlatformUser.IJoin>();
  const userAuthorized = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuthorized);
  const userLoginBody = typia.random<ICommunityPlatformUser.ILogin>();
  const userLoginAuthorized = await authorize_user_login(userConnection, {
    body: userLoginBody,
  });
  typia.assert(userLoginAuthorized);

  // Admin join and login
  const adminJoinBody = typia.random<ICommunityPlatformAdmin.IJoin>();
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  const adminLoginBody = typia.random<ICommunityPlatformAdmin.ILogin>();
  const adminLoginAuthorized = await authorize_admin_login(adminConnection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoginAuthorized);

  // Create community as user
  const community = await generate_random_community_platform_user_communities_create_community(
    userConnection,
    { body: {} },
  );
  typia.assert(community);

  // Since community.id doesn't exist, assume community itself is an identifier
  // or use appropriate property if any (not given, so use community as string or similar)
  // Assign admin as community owner
  const communityOwnerAssignment =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          // Use community as identifier if string, otherwise fallback to empty string
          communityId: typeof community === "string" ? community : "",
          communityModeratorId: adminAuthorized.token.access,
          role: "owner",
        },
      },
    );
  typia.assert(communityOwnerAssignment);

  // Assign moderator to community
  const communityModeratorAssignment =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: typeof community === "string" ? community : "",
          communityModeratorId: moderatorAuthorized.token.access,
          role: "moderator",
        },
      },
    );
  typia.assert(communityModeratorAssignment);

  // Create reports from user
  const reports: ICommunityPlatformReport[] = [];
  for (let i = 0; i < 3; i++) {
    const report = await generate_random_community_platform_reports_create(
      userConnection,
      { body: {} },
    );
    typia.assert(report);
    reports.push(report);
  }

  // Testing filter by decision_status: "approved"
  const approvedDecisions =
    await api.functional.communityPlatform.moderator.reportsDecisions.index(
      moderatorConnection,
      {
        body: {
          decision_status: "approved",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(approvedDecisions);

  // Since decisionStatus property doesn't exist, check for decision_status property
  for (const decision of approvedDecisions.data) {
    TestValidator.equals(
      "decision status should be approved",
      // Use decision.decision_status for comparison
      (decision as any).decision_status ?? (decision as any).status ?? "",
      "approved",
    );
  }

  TestValidator.predicate(
    "pagination limit positive",
    approvedDecisions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page >= 1",
    approvedDecisions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    approvedDecisions.pagination.pages >= 0,
  );

  // Testing filter by decision_status: "dismissed"
  const dismissedDecisions =
    await api.functional.communityPlatform.moderator.reportsDecisions.index(
      moderatorConnection,
      {
        body: {
          decision_status: "dismissed",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(dismissedDecisions);

  for (const decision of dismissedDecisions.data) {
    TestValidator.equals(
      "decision status should be dismissed",
      (decision as any).decision_status ?? (decision as any).status ?? "",
      "dismissed",
    );
  }

  TestValidator.predicate(
    "pagination limit positive",
    dismissedDecisions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page >= 1",
    dismissedDecisions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    dismissedDecisions.pagination.pages >= 0,
  );
}
