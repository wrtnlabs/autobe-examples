import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success_tokens_issued(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection for member join
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  // 1) Create member
  const joined = await authorize_member_join(memberJoinConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(joined);
  // 2) Login with same credentials
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const href = "https://example.com/login" satisfies string &
    tags.Format<"uri">;
  const referrer = "https://example.com/" satisfies string & tags.Format<"uri">;
  const loggedIn = await authorize_member_login(memberLoginConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    },
  });
  typia.assert(loggedIn);
  // 3) Validate identity and token fields
  TestValidator.equals("member id matches joined id", loggedIn.id, joined.id);
  const expiredAt = new Date(loggedIn.token.expired_at);
  const refreshableUntil = new Date(loggedIn.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid ISO datetime",
    !Number.isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO datetime",
    !Number.isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // 4) Ensure no password material leaked
  TestValidator.predicate(
    "response does not contain password",
    JSON.stringify(loggedIn).includes(password) === false,
  );
}
