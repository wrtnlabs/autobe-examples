import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_platform_metadata_retrieval_when_no_successful_deployments(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authentication and no successful deployments
  // This test verifies that when a platform administrator queries for the latest successful deployment
  // but no deployment record with status = 'success' exists, the system returns an empty response (null).
  // The test follows this workflow:
  // 1. A new platform administrator is created via join
  // 2. The administrator is authenticated (token stored in connection)
  // 3. A request is made to retrieve platform metadata (PATCH /community/admin/platform-metadata)
  // 4. The response must be null (no successful deployments exist)
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Retrieve platform metadata - should return null since no successful deployments exist
  const metadata =
    await api.functional.community.admin.platform_metadata.patch(
      adminConnection,
    );
  typia.assert(metadata);
  // 3. Validate response: must be null (no successful deployments exist)
  TestValidator.equals(
    "metadata should be null (no successful deployments)",
    metadata,
    null,
  );
}
