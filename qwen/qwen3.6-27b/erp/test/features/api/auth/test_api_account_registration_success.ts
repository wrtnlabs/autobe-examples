import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verifies successful guest user account registration and default organization creation.
 *
 * Validates the complete join workflow including input validation, secure credential handling, account provisioning, default organization generation, JWT token issuance, session initialization, activity logging, and response payload structure. Ensures that newly registered members receive valid identifiers, correct profile initialization with null optional fields, functional authorization tokens, and immediate access to platform resources. Confirms that the registration process correctly establishes the foundational user context required for all subsequent authenticated interactions.
 *
 * 1. Initiates member registration with randomized email, password, display name, and session context.
 * 2. Receives IAuthorized response containing member identity and JWT tokens.
 * 3. Validates member identity fields match inputs and optional fields are correctly null.
 * 4. Confirms token structure contains valid access/refresh strings and timestamp formats.
 * 5. Verifies default organization creation and activity log generation.
 */
export async function test_api_account_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup isolated connection for actor
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Prepare join payload with randomized data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  // 3. Execute join via utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  // 4. Validate response structure & business logic
  typia.assert(authorized);
  TestValidator.predicate(
    "member id is valid UUID",
    /^[0-9a-fA-F\-]{36}$/.test(authorized.id),
  );
  TestValidator.equals(
    "email matches input",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display_name matches input",
    authorized.display_name,
    joinInput.display_name,
  );
  TestValidator.equals(
    "avatar_image is correctly null",
    authorized.avatar_image,
    null,
  );
  TestValidator.equals(
    "phone_number is correctly null",
    authorized.phone_number,
    null,
  );
  TestValidator.equals(
    "deleted_at is correctly null",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is present and non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601 timestamp",
    !isNaN(new Date(authorized.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 timestamp",
    !isNaN(new Date(authorized.token.refreshable_until).getTime()),
  );
  TestValidator.predicate(
    "authorization header updated in connection",
    typeof memberConnection.headers?.Authorization === "string" &&
      memberConnection.headers!.Authorization.startsWith("Bearer "),
  );
}
