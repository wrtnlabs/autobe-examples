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

export async function test_api_guest_overview_privacy_boundary_no_member_data_leak(
  connection: api.IConnection,
): Promise<void> {
  const expectedKeys = [
    "id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_fingerprint",
  ] as const;
  // 1) Unauthenticated guest browsing (no login)
  const unauthConnection: api.IConnection = { host: connection.host };
  const unauthenticatedOverview =
    await api.functional.communityPlatform.guest.guests.at(unauthConnection);
  typia.assert(unauthenticatedOverview);
  // 2) Authenticate as a guest (obtain guest tokens) using the utility
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = typia.random<string>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const guestAuthorized = await authorize_guest_join(guestJoinConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip,
      href,
      referrer,
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guestAuthorized);
  // 3) Call again as authenticated guest (use token from result)
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = guestAuthorized.token.access;
  const authenticatedOverview =
    await api.functional.communityPlatform.guest.guests.at(guestConnection);
  typia.assert(authenticatedOverview);
  // 4) Privacy boundary: ensure response has ONLY public guest fields
  TestValidator.equals(
    "unauthenticated guest overview keys match",
    Object.keys(unauthenticatedOverview).sort(),
    [...expectedKeys].sort(),
  );
  TestValidator.equals(
    "authenticated guest overview keys match",
    Object.keys(authenticatedOverview).sort(),
    [...expectedKeys].sort(),
  );
  // 5) Both responses must not leak member/admin data via extra fields.
  // Ensured by exact key-set check above + typia.assert.
}
