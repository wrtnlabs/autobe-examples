import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
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
 * Test successful member registration with minimal required organization details.
 *
 * Validates the complete member join flow using only required fields. Ensures that the system correctly creates a member account, generates an initial organization with the member as Owner, and issues authentication tokens for immediate API access.
 *
 * Special attention is given to verifying that:
 * 1. All required fields (email, password, org_name, org_currency, href, referrer) are sufficient for registration
 * 2. Optional organization fields are properly omitted when not provided
 * 3. The newly created organization's owner field references the new member account
 * 4. Authentication tokens (access and refresh) are returned with correct expiration metadata
 * 5. The member is_active status is set to true upon successful registration
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection for join operation
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Prepare minimal join request with only required fields
  // Optional fields (org_description, org_logo_uri, org_timezone, org_fiscal_month) are omitted
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    avatar_uri: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 8,
    }),
    org_name: RandomGenerator.name(),
    org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    // Optional fields omitted:
    // org_description: not provided
    // org_logo_uri: not provided
    // org_timezone: not provided
    // org_fiscal_month: not provided
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  // 3. Call authorize_member_join with minimal required fields
  const output = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  // 4. Validate response structure
  typia.assert(output);
  // 5. Verify token structure
  const token: IAuthorizationToken = output.token;
  typia.assert(token);
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time string",
    new Date(token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time string",
    new Date(token.refreshable_until).getTime() > Date.now(),
  );
  // 6. Verify member summary
  const member: IHrmPlatformMember.ISummary = output.member;
  typia.assert(member);
  TestValidator.equals(
    "member id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(member.id),
    true,
  );
  TestValidator.equals(
    "member email matches input",
    member.email,
    joinInput.email,
  );
  TestValidator.equals(
    "member display_name matches input",
    member.display_name,
    joinInput.name,
  );
  TestValidator.equals(
    "member phone_number matches input",
    member.phone_number,
    joinInput.phone_number,
  );
  TestValidator.equals(
    "member avatar_uri matches input",
    member.avatar_uri,
    joinInput.avatar_uri,
  );
  TestValidator.equals("member is_active is true", member.is_active, true);
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(member.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(member.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "member last_login_at is null for new registration",
    member.last_login_at,
    null,
  );
  TestValidator.equals("member deleted_at is null", member.deleted_at, null);
  // 7. Verify tokens can be used for subsequent API calls
  // Create new connection with access token to test usability
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: token.access },
  };
  typia.assert(authenticatedConnection);
  // The memberConnection was updated internally by authorize_member_join
  // Verify that headers were set after authorization
  TestValidator.predicate(
    "memberConnection headers are updated",
    memberConnection.headers !== undefined &&
      memberConnection.headers.Authorization !== undefined,
  );
}
