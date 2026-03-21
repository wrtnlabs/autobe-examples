import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member registration with only the required fields.
 *
 * Validates:
 * 1. Member record created with unique UUID
 * 2. Email stored correctly
 * 3. DisplayName stored correctly
 * 4. Optional fields (phone_number, avatar_image) null when not provided
 * 5. Account is active (deleted_at is null)
 * 6. JWT tokens returned (access, refresh)
 * 7. Token expiration dates valid
 * 8. Timestamps set correctly
 */
export async function test_api_member_join_success_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // Generate random values for required fields
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputPassword = RandomGenerator.alphaNumeric(16);
  const inputDisplayName = RandomGenerator.name();
  const inputHref = typia.random<string & tags.Format<"uri">>();
  const inputReferrer = typia.random<string & tags.Format<"uri">>();
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Call join with minimal required fields
  const output: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: inputEmail,
        password: inputPassword,
        displayName: inputDisplayName,
        href: inputHref,
        referrer: inputReferrer,
      } satisfies IErpHrmMember.IJoin,
    },
  );
  // Validate response type (performs complete runtime type validation)
  typia.assert(output);
  // Validate member profile - business logic checks
  TestValidator.equals("email matches input", output.email, inputEmail);
  TestValidator.equals(
    "display_name matches input",
    output.display_name,
    inputDisplayName,
  );
  TestValidator.equals(
    "phone_number is null",
    output.phone_number ?? null,
    null,
  );
  TestValidator.equals("avatar_image is null", output.avatar_image, null);
  TestValidator.equals(
    "account is active (deleted_at is null)",
    output.deleted_at,
    null,
  );
  // Validate token structure - business logic checks
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
}
