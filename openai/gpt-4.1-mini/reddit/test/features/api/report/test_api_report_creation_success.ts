import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user connection and authorize user join
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // After authorization, userConnection.headers.Authorization is set
  // 2. Prepare a random report body (partial or full?) using the utility function
  // Actually, since the utility generate_random_community_platform_reports_create prepares and creates, we use it for creation
  // 3. Create a report with valid user (authenticated) using the generation utility
  const report = await generate_random_community_platform_reports_create(
    userConnection,
    {},
  );
  // 4. Assert the report response structure
  typia.assert(report);
  // 5. Removed validation on non-existent properties 'status', 'created_at', 'updated_at'
  // 6. No errors expected during this creation
}
