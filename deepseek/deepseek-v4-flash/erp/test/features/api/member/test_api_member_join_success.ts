import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare member registration data with explicit random values
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create a dedicated connection for the member actor and register
  const memberConnection: api.IConnection = { host: connection.host };
  const output = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name,
      href,
      referrer,
      ip,
    },
  });
  // 1. Validate full response structure
  typia.assert(output);
  // 2. Validate field-level correctness
  TestValidator.equals("email matches", output.email, email);
  TestValidator.equals(
    "display_name matches",
    output.display_name,
    display_name,
  );
  TestValidator.equals("avatar is null for fresh account", output.avatar, null);
  TestValidator.equals(
    "phone_number is null for fresh account",
    output.phone_number,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    output.deleted_at,
    null,
  );
  TestValidator.equals("employees array is empty", output.employees.length, 0);
  TestValidator.equals(
    "ownedOrganizations array is empty",
    output.ownedOrganizations.length,
    0,
  );
  // 3. Session validation
  TestValidator.equals(
    "sessions array has exactly 1 entry",
    output.sessions.length,
    1,
  );
  TestValidator.equals(
    "session ip matches request ip",
    output.sessions[0].ip,
    ip,
  );
  TestValidator.equals(
    "session href matches request href",
    output.sessions[0].href,
    href,
  );
  TestValidator.equals(
    "session referrer matches request referrer",
    output.sessions[0].referrer,
    referrer,
  );
  // 4. Timestamp validation
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(new Date(output.created_at).getTime()),
  );
  TestValidator.equals(
    "updated_at equals created_at for fresh account",
    output.updated_at,
    output.created_at,
  );
  // 5. Token validation
  typia.assert(output.token);
  TestValidator.predicate(
    "access token is not empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    !isNaN(new Date(output.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    !isNaN(new Date(output.token.refreshable_until).getTime()),
  );
  // 6. Verify Authorization header is set on the connection
  TestValidator.predicate(
    "Authorization header is set on connection",
    typeof memberConnection.headers?.Authorization === "string",
  );
  // 7. Verify password is NOT exposed anywhere in the response body
  const responseText = JSON.stringify(output);
  TestValidator.predicate(
    "password is not exposed in response body",
    !responseText.includes(password),
  );
}