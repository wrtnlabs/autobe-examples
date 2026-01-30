import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test successful member login workflow.
 *
 * This test validates the primary authentication flow for returning members:
 *
 * 1. Creates a new member account using the join endpoint
 * 2. Authenticates that member using the login endpoint with valid credentials
 * 3. Verifies that login returns valid JWT access and refresh tokens with proper
 *    expiration timestamps
 * 4. Validates that the response includes complete member profile information (id,
 *    email, name, createdAt, updatedAt)
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique member credentials for this test
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: Create a new member account via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email,
    password,
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/todo/register",
    referrer: "https://example.com",
  } satisfies ITodoAppMember.IJoin;
  const joinedMember = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joinedMember);
  // Step 2: Authenticate the member using login endpoint with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
    href: "https://example.com/todo/login",
    referrer: "https://example.com",
  } satisfies ITodoAppMember.ILogin;
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedInMember);
  // Step 3: Validate member profile information in the response
  TestValidator.equals(
    "login returns correct email",
    loggedInMember.email,
    email,
  );
  TestValidator.predicate(
    "login returns valid UUID id",
    () => typeof loggedInMember.id === "string" && loggedInMember.id.length > 0,
  );
  TestValidator.predicate(
    "login returns name field",
    () =>
      typeof loggedInMember.name === "string" && loggedInMember.name.length > 0,
  );
  TestValidator.predicate(
    "login returns createdAt timestamp",
    () => typeof loggedInMember.createdAt === "string",
  );
  TestValidator.predicate(
    "login returns updatedAt timestamp",
    () => typeof loggedInMember.updatedAt === "string",
  );
  // Step 4: Validate JWT authentication tokens
  TestValidator.predicate(
    "login returns access token",
    () =>
      typeof loggedInMember.token.access === "string" &&
      loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns refresh token",
    () =>
      typeof loggedInMember.token.refresh === "string" &&
      loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login returns expired_at timestamp",
    () => typeof loggedInMember.token.expired_at === "string",
  );
  TestValidator.predicate(
    "login returns refreshable_until timestamp",
    () => typeof loggedInMember.token.refreshable_until === "string",
  );
}
