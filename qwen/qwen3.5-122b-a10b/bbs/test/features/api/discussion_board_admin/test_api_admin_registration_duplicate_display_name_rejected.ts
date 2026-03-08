import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_duplicate_display_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first admin with unique email and specific display name
  const admin1Connection: api.IConnection = { host: connection.host };
  const displayName = RandomGenerator.name();
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: displayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Step 2: Attempt to create second admin with SAME display name but DIFFERENT email
  // Verify the registration is rejected with 409 Conflict error
  await TestValidator.httpError(
    "duplicate display name returns 409 Conflict",
    409,
    async () => {
      const admin2Connection: api.IConnection = { host: connection.host };
      await api.functional.discussionBoard.auth.admin.join(admin2Connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: displayName, // SAME as admin1 - should fail
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
      });
    },
  );
}
