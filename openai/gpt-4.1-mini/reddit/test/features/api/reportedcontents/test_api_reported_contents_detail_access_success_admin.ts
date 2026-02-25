import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reported_contents_detail_access_success_admin(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that an admin can successfully retrieve the details
  // of a reported content link by ID, ensuring proper authorization and response
  // structure compliance.
  // Step 1: Create an admin connection and authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // Assign authorization headers to adminConnection
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // Step 2: Attempt to retrieve a reported content by known valid ID (simulate or real)
  // We generate a random UUID for test purpose since no creation function is given.
  const reportedContentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Call the reportedContents.at utility function to get the ICommunityPlatformReportedContent
  const reportedContent =
    await api.functional.communityPlatform.admin.reportedContents.at(
      adminConnection,
      { id: reportedContentId },
    );
  // Step 4: Validate the returned object is conforming to ICommunityPlatformReportedContent
  typia.assert(reportedContent);
  // Step 5: Assert properties related to deletion state: deletedAt must be either null or string
  TestValidator.predicate(
    "deletedAt is null or string",
    reportedContent.deletedAt === null ||
      typeof reportedContent.deletedAt === "string",
  );
}
