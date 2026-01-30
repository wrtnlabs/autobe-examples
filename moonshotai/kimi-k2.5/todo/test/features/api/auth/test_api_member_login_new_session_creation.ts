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
export async function test_api_member_login_new_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account using join utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const joinedMember = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(joinedMember);
  // Step 2: Login first time to create a new session with proper metadata
  const firstLoginConnection: api.IConnection = { host: connection.host };
  const firstSession = await authorize_member_login(firstLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/todo/login",
      referrer: "https://example.com",
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(firstSession);
  // Verify first session has proper metadata (refresh token, expiration timestamps)
  TestValidator.predicate(
    "first session has refresh token",
    firstSession.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "first session has valid expiration",
    new Date(firstSession.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "first session has valid refreshable until",
    new Date(firstSession.token.refreshable_until).getTime() > Date.now(),
  );
  // Step 3: Login second time to verify multi-device session capability
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondSession = await authorize_member_login(secondLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/todo/login",
      referrer: "https://example.com/mobile",
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(secondSession);
  // Verify second session has proper metadata
  TestValidator.predicate(
    "second session has refresh token",
    secondSession.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second session has valid expiration",
    new Date(secondSession.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "second session has valid refreshable until",
    new Date(secondSession.token.refreshable_until).getTime() > Date.now(),
  );
  // Step 4: Verify distinct refresh tokens for different sessions (multi-device capability)
  TestValidator.notEquals(
    "refresh tokens should be distinct across sessions",
    firstSession.token.refresh,
    secondSession.token.refresh,
  );
  TestValidator.notEquals(
    "access tokens should be distinct across sessions",
    firstSession.token.access,
    secondSession.token.access,
  );
  // Verify consistent member identity across sessions
  TestValidator.equals(
    "member id consistent across sessions",
    firstSession.id,
    secondSession.id,
  );
  TestValidator.equals(
    "member email consistent across sessions",
    firstSession.email,
    secondSession.email,
  );
}
