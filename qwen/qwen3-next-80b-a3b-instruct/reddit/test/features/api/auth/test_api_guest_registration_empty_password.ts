import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_registration_empty_password(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "empty password should fail registration",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "", // Empty password - violates security requirement
          href: "https://example.com/register",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );
}
