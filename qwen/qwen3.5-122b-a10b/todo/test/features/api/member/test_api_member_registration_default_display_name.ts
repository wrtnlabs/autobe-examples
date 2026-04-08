import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_default_display_name(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful member registration with auto-generated display name.
   *
   * Validates that when a new member registers without providing a display_name, the system automatically generates one from the email prefix (the part before the @ symbol). This test ensures the default display name behavior works correctly during the member join process.
   *
   * The registration includes email, password, and session context (href, referrer) while intentionally omitting the optional display_name field. The response should contain the auto-generated display name along with authentication tokens and complete member identity information.
   *
   * 1. Generate random email address for registration.
   * 2. Create registration body without display_name field.
   * 3. Call authorize_member_join utility function.
   * 4. Validate response structure with typia.assert().
   * 5. Verify display_name matches email prefix.
   * 6. Verify authentication tokens are present.
   * 7. Verify email and account status fields.
   */
  // Generate random email address
  const email = typia.random<string & tags.Format<"email">>();
  const emailPrefix = email.split("@")[0];
  // Create member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Register member WITHOUT display_name (should auto-generate from email prefix)
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      // display_name intentionally omitted to test default behavior
    } satisfies ITodoAppMember.IJoin,
  });
  // Validate response structure
  typia.assert(member);
  // Verify display_name was auto-generated from email prefix
  TestValidator.equals(
    "display_name matches email prefix",
    member.display_name,
    emailPrefix,
  );
  // Verify authentication tokens are present
  TestValidator.predicate("has access token", member.token.access.length > 0);
  TestValidator.predicate("has refresh token", member.token.refresh.length > 0);
  // Verify member identity fields
  TestValidator.equals("email matches input", member.email, email);
  TestValidator.predicate(
    "account is active (deleted_at is null)",
    member.deleted_at === null,
  );
}
