import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a non-existent UUID that is unlikely to exist in any system
  const nonExistentSessionId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  // Test that requesting a non-existent guest session returns HTTP 404 error
  await TestValidator.httpError(
    "404 for non-existent guest session",
    404,
    async () =>
      await api.functional.ecommerceMall.guest_sessions.at(connection, {
        sessionId: nonExistentSessionId,
      }),
  );
}
