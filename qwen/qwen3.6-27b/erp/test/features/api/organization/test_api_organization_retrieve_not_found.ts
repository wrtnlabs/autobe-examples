import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization retrieval with non-existent UUID.
 *
 * Validates that the organization retrieval endpoint correctly handles requests for organizations that do not exist in the system. This test ensures the API returns the appropriate 404 Not Found error rather than leaking internal system details or causing server crashes.
 *
 * The test follows a complete authentication and request flow:
 * 1. Member registers through the join endpoint using the authorize utility function
 * 2. A fabricated UUID is generated to simulate a request for a non-existent organization
 * 3. The organizations.at endpoint is called with the fabricated UUID
 * 4. The response is validated to ensure it throws an HttpError with status 404
 *
 * This validation protects against information disclosure vulnerabilities and ensures robust error handling in the organization management system.
 */
export async function test_api_organization_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // 2. Generate a fabricated UUID that does not exist in the system
  const nonExistentOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Call the organization retrieval endpoint and verify 404 error
  await TestValidator.httpError(
    "retrieving non-existent organization throws 404",
    404,
    () =>
      api.functional.hrmPlatform.organizations.at(memberConnection, {
        organizationId: nonExistentOrganizationId,
      }),
  );
}
