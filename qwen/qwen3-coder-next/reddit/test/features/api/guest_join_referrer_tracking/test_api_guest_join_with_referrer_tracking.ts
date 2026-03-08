import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_with_referrer_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test basic guest join with connection context tracking
  const device_id = typia.random<string & tags.Format<"uuid">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const user_agent = RandomGenerator.paragraph({ sentences: 3 });
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_id,
      href,
      referrer,
      user_agent,
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals("device_id matches", authorized.device_id, device_id);
  TestValidator.predicate(
    "has valid uuid format",
    /^[0-9a-f-]{36}$/i.test(authorized.id),
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(authorized.created_at) < new Date(),
  );
  TestValidator.predicate(
    "expired_at is in future",
    new Date(authorized.expired_at) > new Date(),
  );
  TestValidator.equals(
    "has access token",
    typeof authorized.token.access,
    "string",
  );
  TestValidator.equals(
    "has refresh token",
    typeof authorized.token.refresh,
    "string",
  );
  // 2. Test with different referrer scenarios
  const testReferrers = [
    "https://example.com/page",
    "https://myapp.com/internal",
    "https://google.com/search?q=test",
  ];
  for (const testReferrer of testReferrers) {
    const conn2: api.IConnection = { host: connection.host };
    const auth2 = await authorize_guest_join(conn2, {
      body: {
        device_id: typia.random<string & tags.Format<"uuid">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: testReferrer,
        user_agent: RandomGenerator.name(),
      } satisfies IRedditLikeGuest.IJoin,
    });
    typia.assert(auth2);
  }
  // 3. Test additional scenarios
  const conn3: api.IConnection = { host: connection.host };
  const auth3 = await authorize_guest_join(conn3, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      user_agent: RandomGenerator.name(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(auth3);
}
