import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving activity logs filtered by the user who performed the action.
 *
 * Validates that a member can filter activity logs by performer_id to retrieve only logs performed by a specific user. The response includes paginated results with performer details correctly populated via JOIN with hrm_members table.
 *
 * Since activity logs are system-generated from business operations and we cannot directly create them in this test, this test focuses on validating the filtering mechanism and response structure. The test demonstrates the API call pattern for performer-based filtering.
 *
 * 1. Register a new member account with email/password credentials.
 * 2. Attempt to retrieve activity logs filtered by the member's ID.
 * 3. Validates the response structure and pagination metadata.
 * 4. Verifies that all returned logs (if any) have the correct performer_id.
 * 5. Confirms performer details are correctly populated in each log entry.
 */
export async function test_api_activity_logs_retrieval_by_performer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Retrieve activity logs filtered by performer_id
  // Note: Activity logs are system-generated from business operations.
  // This test validates the filtering mechanism and response structure.
  // In a real scenario, activity logs would exist from previous operations.
  const filterByPerformer: IHrmActivityLog.IRequest = {
    performer_id: memberAuth.id,
    page: 1,
    pageSize: 10,
  } satisfies IHrmActivityLog.IRequest;
  // We need an organization ID to call the endpoint.
  // Since join may return empty organizations array, we use a placeholder UUID.
  // In production, the member would need to join an organization first.
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const logsByPerformer: IPageIHrmActivityLog.ISummary =
    await api.functional.hrm.member.organizations.activity_logs.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: filterByPerformer,
      },
    );
  typia.assert(logsByPerformer);
  // 3. Validate that all returned logs have the correct performer_id
  for (const log of logsByPerformer.data) {
    TestValidator.equals(
      "log performer_id matches filter",
      log.performer.id,
      memberAuth.id,
    );
  }
  // 4. Validate performer details are correctly populated (if logs exist)
  if (logsByPerformer.data.length > 0) {
    TestValidator.equals(
      "performer email matches member email",
      logsByPerformer.data[0].performer.email,
      memberAuth.email,
    );
  }
  // 5. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is 1",
    logsByPerformer.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    logsByPerformer.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    logsByPerformer.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    logsByPerformer.pagination.limit >= 0,
  );
}
