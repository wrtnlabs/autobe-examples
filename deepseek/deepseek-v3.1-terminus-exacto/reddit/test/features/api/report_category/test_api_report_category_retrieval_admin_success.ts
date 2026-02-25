import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_category_retrieval_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin user
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Since there's no create report category endpoint available in the provided API functions,
  // we'll test retrieval with a valid UUID format. In a real scenario, we would create
  // a category first then retrieve it, but based on the available endpoints we can only test
  // the retrieval functionality with proper authentication.
  // Use a properly formatted UUID for the test
  const reportCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve report category using the authenticated admin connection
  const reportCategory =
    await api.functional.communityPlatform.admin.report_categories.at(
      adminConnection,
      {
        reportCategoryId,
      },
    );
  typia.assert(reportCategory);
  // The response should be validated by typia.assert() which performs complete validation
  // No additional validation needed as typia.assert() validates all required properties
}
