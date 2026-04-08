import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest session with valid data
  const fingerprint = typia.random<string>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const authorized = await authorize_guest_join(connection, {
    body: {
      fingerprint,
      href,
      referrer,
      ip,
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Validate response data integrity
  TestValidator.equals(
    "guest session fingerprint matches input",
    authorized.fingerprint,
    fingerprint,
  );
  TestValidator.equals("session not soft-deleted", authorized.deleted_at, null);
  TestValidator.predicate(
    "created_at and updated_at are valid timestamps",
    !isNaN(new Date(authorized.created_at).getTime()) &&
      !isNaN(new Date(authorized.updated_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(authorized.updated_at).getTime() >=
      new Date(authorized.created_at).getTime(),
  );
  // 3. Validate token structure and business rules
  typia.assert(authorized.token);
  TestValidator.predicate(
    "access token is non-empty JWT",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires at valid timestamp",
    !isNaN(new Date(authorized.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "session has refreshable deadline",
    !isNaN(new Date(authorized.token.refreshable_until).getTime()),
  );
  TestValidator.predicate(
    "access token expires before or at session deadline",
    new Date(authorized.token.expired_at).getTime() <=
      new Date(authorized.token.refreshable_until).getTime(),
  );
  TestValidator.predicate(
    "access token expires after session creation",
    new Date(authorized.token.expired_at).getTime() >
      new Date(authorized.created_at).getTime(),
  );
  // 4. Test duplicate fingerprint (business rule: must be unique)
  await TestValidator.error("duplicate fingerprint rejected", async () => {
    await authorize_guest_join(connection, {
      body: {
        fingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformGuest.IJoin,
    });
  });
}
