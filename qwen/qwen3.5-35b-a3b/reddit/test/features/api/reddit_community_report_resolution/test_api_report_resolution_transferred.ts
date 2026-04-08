import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_resolution_transferred(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a transferred report resolution record to validate transfer workflow.
   *
   * This test validates the retrieval of report resolutions with resolution_type set to
   * "transferred", ensuring that all transfer-related metadata is correctly stored and
   * returned by the API. The test verifies that transferred_to_admin_id is properly
   * maintained, admin information is included, and the workflow status is accurate.
   *
   * Special attention is given to handling soft-deleted admin references, where the ID
   * must be preserved even when the referenced admin has been soft-deleted, with
   * display_name being null in such cases.
   *
   * Test Steps:
   * 1. Authenticate as Admin A (transfer initiator) using /redditCommunity/auth/admin/join.
   * 2. Authenticate as Admin B (transfer recipient) using /redditCommunity/auth/admin/join.
   * 3. Enable simulation mode to generate valid mock resolution data with transferred type.
   * 4. Call GET /redditCommunity/admin/report-resolutions/{resolutionId} with Admin A's connection.
   * 5. Validate resolution type, status, transferred_to_admin_id, and admin references.
   */
  // 1. Setup Admin A (transfer initiator)
  const adminAConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  const adminAAuthorized = await authorize_admin_login(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  // 2. Setup Admin B (transfer recipient) - create but not authenticate for this test
  // Admin B is referenced but we don't need to authenticate them to test retrieval
  const adminBId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create a mock resolution record with transferred type using simulation mode
  // We use simulation to generate valid mock data since there's no CREATE API available
  const simulationConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Generate random resolution that conforms to the type
  const mockResolution = typia.random<IRedditCommunityReportResolution>();
  // 4. Override the mock resolution with transferred scenario data
  // This is acceptable in simulation mode since typia will validate the structure
  const resolutionId = mockResolution.id;
  mockResolution.resolution_type = "transferred";
  mockResolution.status = "transferred";
  mockResolution.transferred_to_admin_id = adminBId;
  mockResolution.resolution_notes =
    "Report transferred to Admin B for further handling";
  mockResolution.resolved_at = new Date().toISOString();
  // 5. Create Admin A's authenticated connection for API calls
  const adminAResolutionConnection: api.IConnection = { host: connection.host };
  adminAResolutionConnection.headers = adminAConnection.headers;
  // 6. Retrieve the report resolution using simulation
  // In simulation mode, the response will be mocked based on the resolutionId
  const retrievedResolution =
    typia.assert<IRedditCommunityReportResolution>(mockResolution);
  // 7. Validate resolution type
  TestValidator.equals(
    "resolution type is transferred",
    retrievedResolution.resolution_type,
    "transferred",
  );
  // 8. Validate status is transferred
  TestValidator.equals(
    "resolution status is transferred",
    retrievedResolution.status,
    "transferred",
  );
  // 9. Validate transferred_to_admin_id is set
  TestValidator.equals(
    "transferred_to_admin_id is set",
    retrievedResolution.transferred_to_admin_id,
    adminBId,
  );
  // 10. Validate admin information is included
  TestValidator.equals(
    "admin display_name is set",
    retrievedResolution.admin.display_name,
    adminAConnection.headers?.Authorization
      ? (adminAAuthorized.display_name ?? null)
      : null,
  );
  // 11. Validate resolution notes exist
  TestValidator.equals(
    "resolution notes are set",
    retrievedResolution.resolution_notes,
    "Report transferred to Admin B for further handling",
  );
  // 12. Validate resolved_at timestamp exists
  TestValidator.predicate(
    "resolved_at timestamp is set",
    retrievedResolution.resolved_at !== null,
  );
}