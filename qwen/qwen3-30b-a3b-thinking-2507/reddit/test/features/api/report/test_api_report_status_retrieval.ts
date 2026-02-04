import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatus";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_report_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as user for report configurations
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Step 2: Call the API endpoint to get report configurations
  const reportConfigurations =
    await api.functional.communityPlatform.user.reports.configurations.index(
      userConnection,
    );
  // Step 3: Validate the response structure
  typia.assert(reportConfigurations);
  // Step 4: Validate top-level structure
  TestValidator.equals(
    "Report configurations should have pagination object",
    typeof reportConfigurations.pagination,
    "object",
  );
  TestValidator.equals(
    "Report configurations should have data array",
    true,
    Array.isArray(reportConfigurations.data),
  );
  // Step 5: Validate pagination structure
  TestValidator.equals(
    "Pagination should have current property",
    typeof reportConfigurations.pagination.current,
    "number",
  );
  TestValidator.equals(
    "Pagination should have limit property",
    typeof reportConfigurations.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "Pagination should have records property",
    typeof reportConfigurations.pagination.records,
    "number",
  );
  TestValidator.equals(
    "Pagination should have pages property",
    typeof reportConfigurations.pagination.pages,
    "number",
  );
  // Step 6: Validate data array content
  TestValidator.equals(
    "Data array should be empty for this test",
    0,
    reportConfigurations.data.length,
  );
}