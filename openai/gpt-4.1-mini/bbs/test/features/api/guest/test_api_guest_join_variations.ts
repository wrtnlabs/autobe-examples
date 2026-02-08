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

export async function test_api_guest_join_variations(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful guest join
  // Scenario 2: Guest join with optional anonymous ID
  // Scenario 3: Repeated guest join from the same device
  const iso8601Regex =
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/;
  // 1. Successful guest join with required metadata
  {
    const guestConnection: api.IConnection = { host: connection.host };
    const body: IDiscussionBoardGuest.IJoin = {};
    const authorized = await authorize_guest_join(guestConnection, { body });
    typia.assert(authorized);
    typia.assert(authorized.token);
    TestValidator.predicate(
      "access token present",
      authorized.token.access.length > 0,
    );
    TestValidator.predicate(
      "refresh token present",
      authorized.token.refresh.length > 0,
    );
    TestValidator.predicate(
      "access token expired_at format",
      iso8601Regex.test(authorized.token.expired_at),
    );
    TestValidator.predicate(
      "refresh token refreshable_until format",
      iso8601Regex.test(authorized.token.refreshable_until),
    );
  }
  // 2. Guest join including optional anonymous_id
  {
    const guestConnection: api.IConnection = { host: connection.host };
    // According to DTO, body has no such properties:
    const body: IDiscussionBoardGuest.IJoin = {};
    const authorized = await authorize_guest_join(guestConnection, { body });
    typia.assert(authorized);
    typia.assert(authorized.token);
    TestValidator.predicate(
      "access token present (anonymous)",
      authorized.token.access.length > 0,
    );
    TestValidator.predicate(
      "refresh token present (anonymous)",
      authorized.token.refresh.length > 0,
    );
    TestValidator.predicate(
      "access token expired_at format (anonymous)",
      iso8601Regex.test(authorized.token.expired_at),
    );
    TestValidator.predicate(
      "refresh token refreshable_until format (anonymous)",
      iso8601Regex.test(authorized.token.refreshable_until),
    );
  }
  // 3. Repeated guest join from same device
  {
    const guestConnection: api.IConnection = { host: connection.host };
    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      const body: IDiscussionBoardGuest.IJoin = {};
      const authorized = await authorize_guest_join(guestConnection, { body });
      typia.assert(authorized);
      typia.assert(authorized.token);
      TestValidator.predicate(
        `access token present repetition ${i + 1}`,
        authorized.token.access.length > 0,
      );
      TestValidator.predicate(
        `refresh token present repetition ${i + 1}`,
        authorized.token.refresh.length > 0,
      );
      TestValidator.predicate(
        `access token expired_at format repetition ${i + 1}`,
        iso8601Regex.test(authorized.token.expired_at),
      );
      TestValidator.predicate(
        `refresh token refreshable_until format repetition ${i + 1}`,
        iso8601Regex.test(authorized.token.refreshable_until),
      );
    }
  }
}
