import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_creation_minimal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare minimal guest session request data
  const joinInput: IRedditCloneGuest.IJoin = {
    session_token: typia.random<string & tags.Format<"uuid">>(),
    device_id: typia.random<string & tags.Format<"uuid">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    referrer: null,
  };
  // 2. Create guest session with minimal required fields
  const session: IRedditCloneGuest.IAuthorized =
    await api.functional.redditClone.auth.guest.join(connection, {
      body: joinInput,
    });
  typia.assert(session);
  // 3. Validate required fields exist
  TestValidator.equals(
    "session_token exists",
    session.session_token,
    joinInput.session_token,
  );
  TestValidator.equals(
    "device_id matches",
    session.device_id,
    joinInput.device_id,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
  );
  // 4. Validate token structure
  typia.assert<IAuthorizationToken>(session.token);
  TestValidator.equals(
    "token access exists",
    Boolean(session.token.access),
    true,
  );
  TestValidator.equals(
    "token refresh exists",
    Boolean(session.token.refresh),
    true,
  );
  TestValidator.predicate(
    "token expired_at is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.token.expired_at),
  );
  // 5. Validate null referrer handling
  TestValidator.equals(
    "null referrer handled correctly",
    session.session_token,
    joinInput.session_token,
  );
}
