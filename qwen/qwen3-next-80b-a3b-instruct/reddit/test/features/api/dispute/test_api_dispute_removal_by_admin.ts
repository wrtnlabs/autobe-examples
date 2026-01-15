import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_dispute_removal_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuth);
  // Step 2: Generate a random dispute ID (since we cannot create disputes through available API)
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Perform the delete operation using the admin connection
  // According to API definition, this returns the deleted dispute object
  const deleteResponse =
    await api.functional.communityPlatform.admin.report.disputes.erase(
      adminConnection,
      { disputeId },
    );
  typia.assert(deleteResponse);
  // Step 4: Validate that the response matches the ICommunityPlatformReportDispute type
  // Note: We cannot verify the business logic of deletion (since we cannot verify the dispute existed)
  // But we can confirm the type and structure match the expected response contract
  TestValidator.equals("deleted dispute has id", deleteResponse.id, disputeId);
}
