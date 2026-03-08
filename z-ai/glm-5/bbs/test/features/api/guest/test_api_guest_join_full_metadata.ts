import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_full_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Full metadata with all fields provided
  const fullMetadataJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: "https://discussion.example.com/sections/politics",
      referrer: "https://google.com/search?q=politics",
      ip: "192.168.1.100",
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(fullMetadataJoin);
  TestValidator.predicate("has valid UUID id", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      fullMetadataJoin.id,
    ),
  );
  TestValidator.predicate(
    "has access token",
    () =>
      typeof fullMetadataJoin.token.access === "string" &&
      fullMetadataJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    () =>
      typeof fullMetadataJoin.token.refresh === "string" &&
      fullMetadataJoin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expired_at timestamp",
    () => !isNaN(new Date(fullMetadataJoin.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "has valid refreshable_until timestamp",
    () => !isNaN(new Date(fullMetadataJoin.token.refreshable_until).getTime()),
  );
  // Test 2: Nullable referrer (direct visit, no referrer)
  const nullReferrerJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: "https://discussion.example.com/sections/economics",
      referrer: null,
      ip: "10.0.0.50",
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(nullReferrerJoin);
  TestValidator.notEquals(
    "different guest id for null referrer",
    fullMetadataJoin.id,
    nullReferrerJoin.id,
  );
  // Test 3: Server-extracted IP (when client omits ip field)
  const noClientIpJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: "https://discussion.example.com/sections/technology",
      referrer: "https://twitter.com/trending",
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(noClientIpJoin);
  TestValidator.notEquals(
    "different guest id for no client IP",
    fullMetadataJoin.id,
    noClientIpJoin.id,
  );
  // Test 4: Minimum required fields only (device_fingerprint and href)
  const minimalJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(minimalJoin);
  TestValidator.notEquals(
    "different guest id for minimal join",
    fullMetadataJoin.id,
    minimalJoin.id,
  );
}
