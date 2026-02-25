import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_reports_posts_report_create_report } from "../../../generate/generate_random_community_platform_user_reports_posts_report_create_report";
import { prepare_random_community_platform_post_report } from "../../../prepare/prepare_random_community_platform_post_report";

export async function test_api_post_report_creation_unauthorized_guest(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to create a report on an existing post without authentication
  // 1. First, create and join a user to obtain a valid post to report.
  // 2. Create a post report using the authorized user for a post (using utility function for setup).
  // 3. Use the base connection (unauthorized, no token) to try to create a post report.
  // 4. Expect the request to fail with 401 Unauthorized error.
  // 1. Setup: create a valid user and login
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create a post report with authorized user to obtain a legitimate existing post ID
  const reportCreateBody = {
    reason: "Inappropriate content",
  } satisfies ICommunityPlatformPostReport.ICreate;
  // Assuming we need a valid postId to test unauthorized access. We simulate creation of post report for an existing postId.
  // Since postId does not exist from inputs, use a random valid UUID for postId.
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  // But to ensure the postId exists for the test, create a report with authorized user (simulate existence)
  // Not using utility to create report here because utility requires postId, so use already mentioned postId
  const authorizedReport =
    await generate_random_community_platform_user_reports_posts_report_create_report(
      userConnection,
      {
        body: reportCreateBody,
        params: { postId },
      },
    );
  typia.assert(authorizedReport);
  // 3. Perform unauthorized request with base connection
  await TestValidator.httpError(
    "guest cannot create post report",
    401,
    async () => {
      await api.functional.communityPlatform.user.reports.posts.report.createReport(
        connection,
        {
          postId,
          body: reportCreateBody,
        },
      );
    },
  );
}
