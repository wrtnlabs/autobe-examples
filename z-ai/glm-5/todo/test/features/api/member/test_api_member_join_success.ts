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

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for authentication isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // Prepare registration data with random values
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // Register new member using utility function (required pattern)
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Validate complete response structure with typia.assert
  typia.assert(authorized);
  // Validate business logic: email matches input
  TestValidator.equals("email matches input", authorized.email, email);
  // Validate display name exists
  TestValidator.predicate(
    "display name exists",
    authorized.displayName.length > 0,
  );
  // Validate tokens are present
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // Validate expiration times are in the future
  TestValidator.predicate(
    "token expires in future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until is in future",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
  // Verify connection is authenticated (authorization header set by utility)
  TestValidator.predicate(
    "connection authenticated",
    typeof memberConnection.headers?.Authorization === "string" &&
      memberConnection.headers.Authorization.length > 0,
  );
}
