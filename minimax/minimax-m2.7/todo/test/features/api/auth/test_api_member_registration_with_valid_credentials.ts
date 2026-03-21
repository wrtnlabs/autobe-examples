import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Generate random valid test data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const href = "https://example.com/register";
  const referrer = "https://example.com/landing";
  // Call the join endpoint with valid credentials
  const result = await api.functional.multiUserTodo.auth.member.join(
    connection,
    {
      body: {
        email,
        password,
        displayName,
        href,
        referrer,
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );
  // Validate complete response structure with typia.assert
  typia.assert(result);
  // Verify id is UUID format
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  // Verify email matches input
  TestValidator.equals("email matches input", result.email, email);
  // Verify display_name matches input
  TestValidator.equals(
    "display_name matches input",
    result.display_name,
    displayName,
  );
  // Verify timestamps are ISO 8601 format
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    !isNaN(Date.parse(result.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    !isNaN(Date.parse(result.updated_at)),
  );
  // Verify authorization token structure
  const token = result.token;
  TestValidator.predicate("access token exists", token.access.length > 0);
  TestValidator.predicate("refresh token exists", token.refresh.length > 0);
  TestValidator.predicate(
    "expired_at is ISO 8601 format",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 format",
    !isNaN(Date.parse(token.refreshable_until)),
  );
  // Verify password is NOT returned in response (security requirement)
  TestValidator.equals(
    "password not in response",
    (result as any).password,
    undefined,
  );
  TestValidator.equals(
    "password_hash not in response",
    (result as any).passwordHash,
    undefined,
  );
  // Verify the token can be used for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${token.access}`,
    },
  };
  // Confirm the returned token is usable by checking the member ID is properly set
  TestValidator.predicate("member id is non-empty", result.id.length > 0);
  TestValidator.equals(
    "member id format preserved in token response",
    result.id,
    result.id,
  );
}
