import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration with optional display_name field provided.
 * Validates that the display_name is properly stored and returned in the response.
 */
export async function test_api_member_join_with_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test data with display_name
  const displayName = RandomGenerator.name();
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Password${RandomGenerator.alphaNumeric(6)}1!`;
  const username = RandomGenerator.alphaNumeric(12);
  // Create member connection for join
  const memberConnection: api.IConnection = { host: connection.host };
  // Register member with display_name using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      display_name: displayName,
    },
  });
  typia.assert(authorized);
  // Verify display_name is correctly stored
  TestValidator.equals(
    "display_name matches",
    authorized.display_name,
    displayName,
  );
  // Verify other fields are correctly populated
  TestValidator.equals("username matches", authorized.username, username);
  TestValidator.equals("email matches", authorized.email, email.toLowerCase());
  TestValidator.equals("karma initialized to 0", authorized.karma, 0);
  // Verify authentication tokens exist
  TestValidator.predicate(
    "access token exists",
    authorized.accessToken.length > 0,
  );
  TestValidator.predicate(
    "token.access exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    authorized.token.refresh.length > 0,
  );
}
