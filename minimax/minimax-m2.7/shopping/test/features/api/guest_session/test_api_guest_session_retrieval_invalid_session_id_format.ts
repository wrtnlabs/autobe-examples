import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_invalid_session_id_format(
  connection: api.IConnection,
): Promise<void> {
  // Test empty string session ID
  await TestValidator.httpError(
    "empty string session ID returns 400",
    400,
    async () =>
      api.functional.ecommerceMall.guest.guest.sessions.at(connection, {
        sessionId: "" as never,
      }),
  );
  // Test plain non-UUID string
  await TestValidator.httpError(
    "plain non-UUID string returns 400",
    400,
    async () =>
      api.functional.ecommerceMall.guest.guest.sessions.at(connection, {
        sessionId: "invalid-session-id" as never,
      }),
  );
  // Test UUID with invalid characters
  await TestValidator.httpError(
    "UUID with invalid characters returns 400",
    400,
    async () =>
      api.functional.ecommerceMall.guest.guest.sessions.at(connection, {
        sessionId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" as never,
      }),
  );
  // Test UUID missing dashes
  await TestValidator.httpError(
    "UUID missing dashes returns 400",
    400,
    async () =>
      api.functional.ecommerceMall.guest.guest.sessions.at(connection, {
        sessionId: "550e8400e29b41d4a716446655440000" as never,
      }),
  );
}
