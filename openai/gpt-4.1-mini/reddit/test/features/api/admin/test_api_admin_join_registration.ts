import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";

export async function test_api_admin_join_registration(
  connection: api.IConnection,
) {
  // 1. Create an initial admin using api.functional.auth.admin.join
  const initialAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const initialAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: initialAdminEmail,
        password: "SuperSecurePassword123!",
        href: "https://www.example.com/admin/join",
        referrer: "https://www.example.com/admin",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(initialAdmin); // Validate response

  // 2. Attempt to create a duplicate admin with the same email and expect an error
  await TestValidator.error(
    "cannot create duplicate admin with same email",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: initialAdminEmail,
          password: "AnotherPassword456$",
          href: "https://www.example.com/admin/join",
          referrer: "https://www.example.com/admin",
        } satisfies IRedditCommunityAdmin.IJoin,
      });
    },
  );
}
