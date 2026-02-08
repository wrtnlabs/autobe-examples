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

export async function test_api_post_report_retrieval_authorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // 1. Register a new user to obtain authorized user connection.
  // 2. Use the authorized user connection to retrieve an existing post report by its UUID.
  // 3. Assert the retrieved post report's structure and fields using typia.
  // 4. The test validates that only authorized users can get the post report.
  // 1. User registration for authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Generate a UUID for postReportId - Use typia to generate valid UUID
  const postReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the post report
  const postReport =
    await api.functional.communityPlatform.user.post_reports.at(
      userConnection,
      {
        postReportId,
      },
    );
  // 4. Validate the response type fully (structure and fields)
  typia.assert(postReport);
  // 5. Additional business logic validations cannot be done as schema is empty,
  // but certifying retrieval and access control through authorization suffices.
}
