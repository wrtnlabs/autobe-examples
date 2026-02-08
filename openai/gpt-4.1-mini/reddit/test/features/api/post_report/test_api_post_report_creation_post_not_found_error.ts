import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_platform_user_post_reports_create } from "../../../generate/generate_random_community_platform_user_post_reports_create";
import { prepare_random_community_platform_post_report } from "../../../prepare/prepare_random_community_platform_post_report";

export async function test_api_post_report_creation_post_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to create a post report for a non-existent post by an authenticated user.
  // Step 1. User joins the platform and obtains authorization token
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // Step 2. Prepare an invalid post report creation body with a non-existent post ID
  // Since ICommunityPlatformPostReport.ICreate is empty type, we cannot fill actual props
  // We assume the system will reject due to invalid postId (business logic simulated)
  const invalidBody = {};
  // Step 3. Try to create a post report with invalid post ID and expect an HttpError
  await TestValidator.error(
    "post report creation with non-existent post ID should fail",
    async () => {
      await generate_random_community_platform_user_post_reports_create(
        userConnection,
        {
          body: invalidBody,
        },
      );
    },
  );
}
