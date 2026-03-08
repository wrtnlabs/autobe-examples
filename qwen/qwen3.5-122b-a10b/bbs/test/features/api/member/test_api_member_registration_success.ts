import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member account registration with valid credentials.
 * 
 * Verifies that a new member can register with:
 * - Unique email address (valid email format)
 * - Valid password meeting security requirements (8+ characters with uppercase, lowercase, and number)
 * - Unique display name
 * 
 * Upon successful registration, validates:
 * - Member account created with ban_status='active'
 * - JWT access and refresh tokens returned
 * - Response structure matches IDiscussionBoardMember.IAuthorized schema
 * - Token structure includes access, refresh, expired_at, refreshable_until
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };

  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // 16 chars with uppercase, lowercase, numbers
  const displayName = RandomGenerator.name(1);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();

  // Register member using utility function
  const member: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
        display_name: displayName,
        href,
        referrer,
        ip,
      } satisfies IDiscussionBoardMember.IJoin,
    });

  // Validate response structure
  typia.assert(member);

  // Verify member profile information (business logic)
  TestValidator.equals("email matches input", member.email, email);
  TestValidator.equals("display name matches input", member.displayName, displayName);
  TestValidator.predicate("ban status is active", member.banStatus === "active");

  // Verify token structure (business logic - tokens are generated)
  TestValidator.predicate("token has access", member.token.access.length > 0);
  TestValidator.predicate("token has refresh", member.token.refresh.length > 0);
  TestValidator.predicate("token has expired_at", member.token.expired_at.length > 0);
  TestValidator.predicate("token has refreshable_until", member.token.refreshable_until.length > 0);
}