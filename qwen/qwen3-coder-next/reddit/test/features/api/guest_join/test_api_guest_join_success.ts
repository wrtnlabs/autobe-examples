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

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid device_id for guest account
  const device_id = typia.random<string & tags.Format<"uuid">>();
  // Create guest account with valid device_id
  const output = await api.functional.redditLike.auth.guest.join(connection, {
    body: { device_id } satisfies IRedditLikeGuest.IJoin,
  });
  // Validate response structure and content
  typia.assert(output);
  // Verify essential fields
  TestValidator.equals("device_id matches input", output.device_id, device_id);
  TestValidator.predicate("has valid id", /^[0-9a-f-]{36}$/i.test(output.id));
  TestValidator.predicate(
    "has valid access token",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expired_at",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    output.token.refreshable_until.length > 0,
  );
  TestValidator.predicate("has valid created_at", output.created_at.length > 0);
  TestValidator.predicate("has valid updated_at", output.updated_at.length > 0);
}
