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

export async function test_api_admin_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Generate a specific email for testing duplicate constraint
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // Prepare connection for first admin registration
  const firstConnection: api.IConnection = { host: connection.host };
  // Create first admin account with the specific email
  const firstAdmin = await authorize_admin_join(firstConnection, {
    body: {
      email: duplicateEmail,
    },
  });
  typia.assert(firstAdmin);
  // Validate first registration succeeded with expected business logic
  TestValidator.equals("first admin email", firstAdmin.email, duplicateEmail);
  TestValidator.equals("first admin grade", firstAdmin.grade, "regular");
  TestValidator.equals("first admin not banned", firstAdmin.bannedAt, null);
  TestValidator.equals("first admin not deleted", firstAdmin.deletedAt, null);
  TestValidator.predicate(
    "first admin has access token",
    firstAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "first admin has refresh token",
    firstAdmin.token.refresh.length > 0,
  );
  // Prepare second join request with same email but different credentials
  const secondJoinBody = {
    email: duplicateEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  // Verify second registration with same email is rejected
  await TestValidator.error("duplicate email rejected", async () => {
    const secondConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.auth.admin.join(secondConnection, {
      body: secondJoinBody,
    });
  });
}
