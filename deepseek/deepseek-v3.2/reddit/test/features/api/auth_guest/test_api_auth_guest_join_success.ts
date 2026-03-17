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

export async function test_api_auth_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: First join with unique anonymous_id
  const anonymousId = typia.random<string & tags.Format<"uuid">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const firstJoin = await authorize_guest_join(guestConnection, {
    body: {
      anonymous_id: anonymousId,
      href,
      referrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstJoin);
  // Validate response structure
  TestValidator.equals(
    "response contains guest ID",
    typeof firstJoin.id,
    "string",
  );
  TestValidator.equals(
    "response contains token",
    typeof firstJoin.token,
    "object",
  );
  TestValidator.equals(
    "token contains access token",
    typeof firstJoin.token.access,
    "string",
  );
  TestValidator.equals(
    "token contains refresh token",
    typeof firstJoin.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token contains expired_at",
    typeof firstJoin.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token contains refreshable_until",
    typeof firstJoin.token.refreshable_until,
    "string",
  );
  // Step 2: Second join with same anonymous_id should retrieve existing guest
  const secondJoin = await authorize_guest_join(guestConnection, {
    body: {
      anonymous_id: anonymousId,
      href: typia.random<string & tags.Format<"uri">>(), // different href
      referrer: typia.random<string & tags.Format<"uri">>(), // different referrer
    },
  });
  typia.assert(secondJoin);
  // Verify same guest ID returned (existing record retrieved)
  TestValidator.equals(
    "same guest ID for duplicate anonymous_id",
    secondJoin.id,
    firstJoin.id,
  );
  // Token should be different (new session)
  TestValidator.notEquals(
    "new access token generated",
    secondJoin.token.access,
    firstJoin.token.access,
  );
  TestValidator.notEquals(
    "new refresh token generated",
    secondJoin.token.refresh,
    firstJoin.token.refresh,
  );
}
