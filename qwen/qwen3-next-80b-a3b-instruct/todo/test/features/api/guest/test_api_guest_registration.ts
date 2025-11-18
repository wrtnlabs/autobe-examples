import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_registration(connection: api.IConnection) {
  // Generate random valid guest registration data
  const guestData: ITodoListGuest.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 20 }),
    referrer: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 20,
    }),
    ip: typia.random<string | null | undefined>(),
  };

  // Execute guest registration
  const result: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestData,
    });

  // Verify response structure and types
  typia.assert(result);

  // Validate email matches input
  TestValidator.equals(
    "email matches registered email",
    result.email,
    guestData.email,
  );

  // Test duplicate registration fails
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: guestData,
      });
    },
  );
}
