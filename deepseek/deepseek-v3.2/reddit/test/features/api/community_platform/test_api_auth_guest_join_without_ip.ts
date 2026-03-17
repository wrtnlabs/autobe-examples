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

export async function test_api_auth_guest_join_without_ip(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for guest join
  const guestConnection: api.IConnection = { host: connection.host };
  // Test that a guest can join without providing IP address
  const joinBody: ICommunityPlatformGuest.IJoin = {
    anonymous_id: typia.random<string & tags.Format<"uuid">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // Omit ip field to test optional behavior
  } satisfies ICommunityPlatformGuest.IJoin as ICommunityPlatformGuest.IJoin;
  // Call guest join API - using the utility function as required
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Validate response structure
  TestValidator.equals(
    "authorized should have id",
    typeof authorized.id,
    "string",
  );
  TestValidator.predicate("id should be UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Validate token structure
  TestValidator.equals(
    "authorized should have token",
    typeof authorized.token,
    "object",
  );
  TestValidator.equals(
    "token should have access",
    typeof authorized.token.access,
    "string",
  );
  TestValidator.equals(
    "token should have refresh",
    typeof authorized.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token should have expired_at",
    typeof authorized.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token should have refreshable_until",
    typeof authorized.token.refreshable_until,
    "string",
  );
  // Validate timestamp formats
  TestValidator.predicate("expired_at should be ISO string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate("refreshable_until should be ISO string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      authorized.token.refreshable_until,
    ),
  );
  // Validate token expiration ordering
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    () => refreshableUntil > expiredAt,
  );
}
