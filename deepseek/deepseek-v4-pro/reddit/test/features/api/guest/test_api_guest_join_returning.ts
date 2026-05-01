import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a returning guest visitor with a recognized device fingerprint re-establishes a session without creating a duplicate guest record.
 *
 * Validates the find-or-create pattern's find branch: the system must locate the existing guest record by fingerprint rather than inserting a new one. The original created_at timestamp must be preserved, while updated_at reflects the most recent visit. New session tokens must be distinct from previously issued tokens.
 *
 * 1. Generate a stable device fingerprint and call the guest join endpoint to create a guest record.
 * 2. Wait briefly, then call join again with the same fingerprint to simulate a returning visit.
 * 3. Verify the guest UUID is identical across both joins, confirming the find branch was used.
 * 4. Verify created_at is unchanged and updated_at has advanced.
 * 5. Verify access and refresh tokens differ between the two sessions.
 * 6. Verify the response fingerprint matches the input.
 */
export async function test_api_guest_join_returning(
  connection: api.IConnection,
): Promise<void> {
  const fingerprint = RandomGenerator.alphaNumeric(32);
  const firstConnection: api.IConnection = { host: connection.host };
  const first = await authorize_guest_join(firstConnection, {
    body: { fingerprint },
  });
  typia.assert(first);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const secondConnection: api.IConnection = { host: connection.host };
  const second = await authorize_guest_join(secondConnection, {
    body: { fingerprint },
  });
  typia.assert(second);
  TestValidator.equals("guest id unchanged", first.id, second.id);
  TestValidator.equals(
    "created_at unchanged",
    first.created_at,
    second.created_at,
  );
  TestValidator.notEquals(
    "updated_at updated",
    first.updated_at,
    second.updated_at,
  );
  TestValidator.predicate(
    "updated_at is later",
    second.updated_at > first.updated_at,
  );
  TestValidator.notEquals(
    "access tokens differ",
    first.token.access,
    second.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    first.token.refresh,
    second.token.refresh,
  );
  TestValidator.equals("fingerprint matches", second.fingerprint, fingerprint);
}
