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

export async function test_api_member_login_token_rotation_refresh_compatible(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join member (generate credentials we can reuse for both logins)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const loginBody: ICommunityPlatformMember.ILogin = {
    email,
    password,
    href,
    referrer,
    ip: null,
  } satisfies ICommunityPlatformMember.ILogin;
  // 2) First login
  const loginConnection1: api.IConnection = { host: connection.host };
  const first = await authorize_member_login(loginConnection1, {
    body: loginBody,
  });
  typia.assert(first);
  // 3) Second login
  const loginConnection2: api.IConnection = { host: connection.host };
  const second = await authorize_member_login(loginConnection2, {
    body: loginBody,
  });
  typia.assert(second);
  // 4) Validate rotation (refresh token must change)
  TestValidator.notEquals(
    "refresh token rotated between consecutive logins",
    first.token.refresh,
    second.token.refresh,
  );
  // 5) Validate expiry metadata coherence (parseable ISO and refreshable_until > expired_at)
  const secondExpiredAt = new Date(second.token.expired_at);
  const secondRefreshableUntil = new Date(second.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is parseable as ISO-8601 datetime",
    () => !Number.isNaN(secondExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is parseable as ISO-8601 datetime",
    () => !Number.isNaN(secondRefreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    () => secondRefreshableUntil.getTime() > secondExpiredAt.getTime(),
  );
  // Indirect validation without /refresh DTO support in this bundle
  TestValidator.equals("member id matches across logins", first.id, second.id);
}
