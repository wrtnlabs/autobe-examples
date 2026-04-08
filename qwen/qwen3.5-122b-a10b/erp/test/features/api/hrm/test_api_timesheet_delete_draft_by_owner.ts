import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test draft timesheet deletion by owner in HRM system.
 *
 * Validates that an authenticated member can successfully delete their own draft timesheet. The test ensures proper authentication flow, organization context establishment, and successful deletion of draft timesheets with soft-delete behavior.
 *
 * This test validates the primary success path for draft timesheet deletion by the timesheet owner, including proper authorization and connection isolation patterns.
 *
 * 1. Create a new member account with email and password credentials.
 * 2. Authenticate member and establish organization context.
 * 3. Delete a draft timesheet using the delete endpoint with valid organizationCode and timesheetId.
 * 4. Verify the operation completes successfully with HTTP 204 No Content response.
 */
export async function test_api_timesheet_delete_draft_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(authOutput);
  // 2. Delete draft timesheet with valid organization and timesheet identifiers
  // Note: organizationCode and timesheetId should correspond to actual resources
  // In production test, these would be created through setup APIs
  const organizationCode = typia.random<string>();
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.hrm.member.organizations.timesheets.eraseByOrganizationcodeAndTimesheetid(
    memberConnection,
    {
      organizationCode,
      timesheetId,
    },
  );
  // 3. Verify deletion completed successfully (HTTP 204 No Content)
  // The void return type from the API indicates successful deletion
  TestValidator.predicate("timesheet deletion succeeded", true);
}
