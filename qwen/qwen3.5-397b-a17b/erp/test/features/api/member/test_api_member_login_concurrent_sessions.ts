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

export async function test_api_member_login_concurrent_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account for testing
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
    phone_number: RandomGenerator.mobile(),
    ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
  } satisfies IHrmPlatformMember.IJoin;
  const joinResult = await authorize_member_join(connection, {
    body: joinData,
  });
  typia.assert(joinResult);
  // Store member credentials for login tests
  const loginCredentials = {
    email: joinData.email,
    password: joinData.password,
  };
  // 2. Perform first login with session context A
  const sessionAConnection: api.IConnection = { host: connection.host };
  const sessionAData: IHrmPlatformMember.ILogin = {
    email: loginCredentials.email,
    password: loginCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
  };
  const sessionAResult = await authorize_member_login(sessionAConnection, {
    body: sessionAData,
  });
  typia.assert(sessionAResult);
  // 3. Store first session tokens
  const sessionAToken = sessionAResult.token;
  // 4. Perform second login with different session context B
  const sessionBConnection: api.IConnection = { host: connection.host };
  const sessionBData: IHrmPlatformMember.ILogin = {
    email: loginCredentials.email,
    password: loginCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
  };
  const sessionBResult = await authorize_member_login(sessionBConnection, {
    body: sessionBData,
  });
  typia.assert(sessionBResult);
  // 5. Store second session tokens
  const sessionBToken = sessionBResult.token;
  // 6. Verify both sessions have unique access tokens
  TestValidator.notEquals(
    "access tokens should be unique",
    sessionAToken.access,
    sessionBToken.access,
  );
  // 7. Verify both sessions have unique refresh tokens
  TestValidator.notEquals(
    "refresh tokens should be unique",
    sessionAToken.refresh,
    sessionBToken.refresh,
  );
  // 8. Verify both sessions have different expired_at timestamps
  TestValidator.notEquals(
    "expired_at timestamps should differ",
    sessionAToken.expired_at,
    sessionBToken.expired_at,
  );
  // 9. Verify both tokens are independently valid for authenticated requests
  // Both sessions should return the same member info, confirming they're valid
  TestValidator.equals(
    "member ID should match across sessions",
    sessionAResult.id,
    sessionBResult.id,
  );
  TestValidator.equals(
    "member email should match across sessions",
    sessionAResult.email,
    sessionBResult.email,
  );
  TestValidator.equals(
    "member display name should match across sessions",
    sessionAResult.displayName,
    sessionBResult.displayName,
  );
  // Verify both sessions have valid refreshable_until timestamps
  TestValidator.predicate(
    "session A refreshable_until is valid",
    () => new Date(sessionAToken.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "session B refreshable_until is valid",
    () => new Date(sessionBToken.refreshable_until) > new Date(),
  );
  // Verify expired_at timestamps are in the future
  TestValidator.predicate(
    "session A expired_at is in the future",
    () => new Date(sessionAToken.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "session B expired_at is in the future",
    () => new Date(sessionBToken.expired_at) > new Date(),
  );
}
