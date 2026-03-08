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
  // Prepare guest join request with required fields only
  const joinRequest: IRedditLikeGuest.IJoin = {
    device_id: typia.random<string & tags.Format<"uuid">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  // Call guest join endpoint
  const result: IRedditLikeGuest.IAuthorized =
    await api.functional.redditLike.auth.guest.join(connection, {
      body: joinRequest,
    });
  // Validate response structure
  typia.assert(result);
  // Verify required properties exist
  TestValidator.predicate("has guest id", result.id !== undefined);
  TestValidator.predicate("has device_id", result.device_id !== undefined);
  TestValidator.predicate("has created_at", result.created_at !== undefined);
  TestValidator.predicate("has updated_at", result.updated_at !== undefined);
  TestValidator.predicate("has access token", result.access !== undefined);
  TestValidator.predicate("has refresh token", result.refresh !== undefined);
  TestValidator.predicate("has expired_at", result.expired_at !== undefined);
  // Validate UUID formats
  TestValidator.predicate(
    "guest id is UUID",
    /^[0-9a-f-]{36}$/i.test(result.id),
  );
  TestValidator.predicate(
    "device_id is UUID",
    /^[0-9a-f-]{36}$/i.test(result.device_id),
  );
  // Validate timestamp formats (ISO 8601)
  TestValidator.predicate(
    "created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result.created_at),
  );
  TestValidator.predicate(
    "expired_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result.expired_at),
  );
  // Validate access token is JWT format (3 parts separated by dots)
  TestValidator.predicate(
    "access token is JWT format",
    /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(result.access),
  );
  // Validate refresh token is JWT format
  TestValidator.predicate(
    "refresh token is JWT format",
    /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(result.refresh),
  );
  // Validate token object structure
  TestValidator.predicate(
    "has token object",
    result.token !== undefined && result.token !== null,
  );
  if (result.token) {
    TestValidator.predicate(
      "token has access",
      result.token.access !== undefined && result.token.access !== null,
    );
    TestValidator.predicate(
      "token has refresh",
      result.token.refresh !== undefined && result.token.refresh !== null,
    );
    TestValidator.predicate(
      "token has expired_at",
      result.token.expired_at !== undefined && result.token.expired_at !== null,
    );
    TestValidator.predicate(
      "token has refreshable_until",
      result.token.refreshable_until !== undefined &&
        result.token.refreshable_until !== null,
    );
  }
}
