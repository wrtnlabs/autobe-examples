import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. First guest join with unique device fingerprint
  const device_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const firstGuestConnection: api.IConnection = { host: connection.host };
  const firstGuest: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(firstGuestConnection, {
      body: {
        device_id,
        href,
        referrer,
      } satisfies IRedditCommunityGuest.IJoin,
    });
  typia.assert(firstGuest);
  // 2. Verify first guest registration succeeded
  TestValidator.predicate("first guest has id", firstGuest.id !== undefined);
  TestValidator.predicate(
    "first guest has access token",
    firstGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "first guest has refresh token",
    firstGuest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has valid expiration",
    new Date(firstGuest.token.expired_at) > new Date(),
  );
  // 3. Attempt duplicate registration with same device fingerprint
  const duplicateGuestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate device fingerprint rejected",
    async () => {
      await authorize_guest_join(duplicateGuestConnection, {
        body: {
          device_id,
          href,
          referrer,
        } satisfies IRedditCommunityGuest.IJoin,
      });
    },
  );
  // 4. Verify original guest account still exists with valid session
  typia.assert(firstGuest);
  TestValidator.predicate(
    "original guest id preserved",
    firstGuest.id.length > 0,
  );
  TestValidator.predicate(
    "original access token preserved",
    firstGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "original refresh token preserved",
    firstGuest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "original expiration preserved",
    firstGuest.token.expired_at.length > 0,
  );
}
