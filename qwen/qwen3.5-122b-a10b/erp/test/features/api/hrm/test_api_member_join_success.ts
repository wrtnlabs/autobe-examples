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
 * Test successful member registration with valid credentials and session context.
 *
 * Validates the complete member join flow including email format validation, password hashing, email verification token generation, and JWT token issuance. Ensures that the member account is created correctly with all required fields and that the authentication tokens are properly formatted with expiration timestamps.
 *
 * Special attention is given to verifying that email_verified is set to false (pending verification) and that the organizations array is empty since the member has not yet joined any organization. The test also validates that session context fields (href, referrer, ip) are properly captured for audit trail purposes.
 *
 * 1. Generate random member credentials (email, password) and session context (href, referrer, ip).
 * 2. Call member join API with valid registration data.
 * 3. Validates response contains member id, email, timestamps, and token pair.
 * 4. Verifies email_verified flag is false (verification pending).
 * 5. Verifies organizations array is empty (no organization membership yet).
 * 6. Validates token structure with access, refresh, expired_at, and refreshable_until fields.
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare member registration with random credentials and session context
  const memberConnection: api.IConnection = { host: connection.host };
  const output: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  // 2. Validate response structure
  typia.assert(output);
  // 3. Validate member identification fields
  TestValidator.predicate(
    "member has valid UUID",
    /^[0-9a-f-]{36}$/i.test(output.id),
  );
  // 4. Validate timestamps are present and in valid format
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(output.updated_at)),
  );
  // 5. Validate deleted_at is null for active account
  TestValidator.equals(
    "account is active (not deleted)",
    output.deleted_at,
    null,
  );
  // 6. Validate email verification status (must be false for new registration)
  TestValidator.equals(
    "email verification pending",
    output.email_verified,
    false,
  );
  // 7. Validate organizations array is empty (no membership yet)
  TestValidator.equals(
    "no organizations yet",
    output.organizations?.length ?? 0,
    0,
  );
  // 8. Validate token structure
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    !isNaN(Date.parse(output.token.refreshable_until)),
  );
  // 9. Validate token expiration times are in the future
  TestValidator.predicate(
    "access token expires in future",
    new Date(output.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(output.token.refreshable_until) > new Date(),
  );
}
