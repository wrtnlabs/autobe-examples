import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_reported_content_update_admin_invalid_report_link(
  connection: api.IConnection,
): Promise<void> {
  // This E2E test validates that updating a reported content by an admin to link a non-existent report ID is rejected.
  // 1. Setup user actor: Join and login user
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinData: Partial<ICommunityPlatformUser.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  };
  const userAuth = await authorize_user_join(userConnection, {
    body: userJoinData,
  });
  typia.assert(userAuth);
  const loggedInUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(loggedInUserConnection, {
    body: {
      email: userJoinData.email!,
      password: userJoinData.password!,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 2. Setup admin actor: Join and login admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinData: Partial<ICommunityPlatformAdmin.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: RandomGenerator.name(1),
    bio: null,
    avatarUrl: null,
  };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuth);
  const loggedInAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loggedInAdminConnection, {
    body: {
      email: adminJoinData.email!,
      password: adminJoinData.password!,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 3. User creates a report (needed for valid report ID usage reference)
  const reportCreateBody: ICommunityPlatformReport.ICreate = {
    // Generate a report creation body with valid content filled.
    // We simulate a post report with dummy UUIDs as placeholders
    // Real IDs would be dynamic in real environment, so we only need any valid structure
  } as any;
  const createdReport =
    await api.functional.communityPlatform.user.reports.create(
      loggedInUserConnection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);
  // 4. Admin attempts to update a reported content to link to a non-existent report ID
  const invalidReportId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: ICommunityPlatformReportedContent.IUpdate = {
    community_platform_report_id: invalidReportId, // Intentionally invalid
    community_platform_reported_post_id: null,
    community_platform_reported_comment_id: null,
  };
  // Use a random UUID for reported content ID to test update failure due to invalid report link
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Expect update attempt to fail with error due to invalid report link
  await TestValidator.error(
    "admin update reported content with invalid report link",
    async () => {
      await api.functional.communityPlatform.admin.reportedContents.update(
        loggedInAdminConnection,
        {
          id: reportedContentId,
          body: updateBody,
        },
      );
    },
  );
}
