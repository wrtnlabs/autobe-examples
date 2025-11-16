import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_registration_password_too_short(
  connection: api.IConnection,
) {
  // Generate a valid email and a password that is exactly 7 characters long (one character below the minimum security requirement)
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(7); // 7 characters - below the 8-character minimum

  // Assert that this registration attempt with a too-short password should fail
  await TestValidator.error(
    "registration should fail with password shorter than 8 characters",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: email,
          password: password,
          href: "https://example.com/join",
          referrer: "https://example.com/",
        } satisfies IGuest.ICreate,
      });
    },
  );
}
