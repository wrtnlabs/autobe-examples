import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Join with all fields explicitly provided
  const output = await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/todos",
      referrer: "https://google.com/search?q=todo+app",
      ip: "192.168.1.1",
    },
  });
  typia.assert(output);
  // 2. Validate JWT structure: three dot-separated base64 segments
  const segments = output.token.access.split(".");
  TestValidator.equals("JWT has three segments", segments.length, 3);
  // 3. Base64-decode the JWT payload and verify it contains the guest id claim
  const payload = JSON.parse(
    Buffer.from(segments[1], "base64url").toString("utf-8"),
  );
  TestValidator.predicate(
    "JWT payload contains guest id claim",
    payload.sub === output.id || typeof payload.id === "string",
  );
  // 4. Validate timestamps are in the future (tokens freshly issued)
  const now = new Date();
  const expiredAt = new Date(output.token.expired_at);
  const refreshableUntil = new Date(output.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
  // 5. Confirm access token expires before the session
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    expiredAt.getTime() < refreshableUntil.getTime(),
  );
  // 6. Validate created_at and updated_at are valid date-time strings
  // (structural validation already done by typia.assert for Format<"date-time">)
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(output.updated_at)),
  );
}
