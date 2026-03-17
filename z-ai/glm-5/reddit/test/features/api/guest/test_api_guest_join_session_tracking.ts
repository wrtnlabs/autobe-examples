import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create first guest with specific session context
  const guest1 = await authorize_guest_join(connection, {
    body: {
      href: "https://example.com/communities",
      referrer: "https://google.com/search?q=community",
      ip: "192.168.1.1",
    },
  });
  typia.assert(guest1);
  // Create second guest with different session context
  const guest2 = await authorize_guest_join(connection, {
    body: {
      href: "https://example.com/posts",
      referrer: "https://twitter.com/",
      ip: "10.0.0.1",
    },
  });
  typia.assert(guest2);
  // Verify each guest receives unique id (separate sessions)
  TestValidator.notEquals("guest IDs are unique", guest1.id, guest2.id);
  // Verify access tokens are unique
  TestValidator.notEquals(
    "access tokens are unique",
    guest1.token.access,
    guest2.token.access,
  );
  // Verify refresh tokens are unique
  TestValidator.notEquals(
    "refresh tokens are unique",
    guest1.token.refresh,
    guest2.token.refresh,
  );
  // Verify token expiration is in the future
  const now = new Date();
  TestValidator.predicate(
    "token expiration is future",
    new Date(guest1.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh deadline is future",
    new Date(guest1.token.refreshable_until) > now,
  );
}
