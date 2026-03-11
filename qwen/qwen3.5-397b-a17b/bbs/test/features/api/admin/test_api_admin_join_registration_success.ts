import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator account registration success path.
 *
 * This test verifies the complete administrator registration workflow:
 * 1. Creates a new administrator account with valid credentials
 * 2. Validates the response contains all required fields
 * 3. Confirms administrator grade is 'regular' by default
 * 4. Verifies JWT tokens are properly generated with expiration metadata
 * 5. Ensures member profile summary is included in the response
 */
export async function test_api_admin_join_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare registration data with valid credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  // Register administrator using utility function
  const authorized: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: joinInput,
    });
  // Validate response structure and types (includes all format validations)
  typia.assert(authorized);
  // Validate administrator grade is 'regular' by default (business rule)
  TestValidator.equals("admin grade is regular", authorized.grade, "regular");
  // Validate member profile is included and matches input
  TestValidator.predicate("member profile exists", authorized.member !== null);
  TestValidator.equals(
    "member display name matches",
    authorized.member.display_name,
    joinInput.display_name,
  );
  // Validate tokens are present (existence check, not format validation)
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // Validate is_admin flag is true (business rule)
  TestValidator.equals(
    "member is_admin flag is true",
    authorized.member.is_admin,
    true,
  );
}
