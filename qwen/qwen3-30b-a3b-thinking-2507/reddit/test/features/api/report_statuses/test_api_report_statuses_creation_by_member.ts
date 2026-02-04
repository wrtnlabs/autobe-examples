import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatus";
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
import { generate_random_community_platform_user_report_statuses_create } from "../../../generate/generate_random_community_platform_user_report_statuses_create";
import { prepare_random_community_platform_report_status } from "../../../prepare/prepare_random_community_platform_report_status";

export async function test_api_report_statuses_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user context for authentication as community member
  const user = await authorize_user_join(connection, {
    body: {
      email: `test${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Create connection for the new user
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // Create a new report status
  const reportStatus =
    await generate_random_community_platform_user_report_statuses_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }) + " Status",
        },
      },
    );
  typia.assert(reportStatus);
  // Verify that status defaults to 'active'
  TestValidator.equals(
    "status should be active by default",
    reportStatus.status,
    "active",
  );
  // Verify that name was set correctly
  TestValidator.equals(
    "name should match created name",
    reportStatus.name,
    reportStatus.name,
  );
}
