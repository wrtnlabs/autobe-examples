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

export async function test_api_admin_registration_with_super_grade(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate registration data with super grade
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    grade: "super" as const,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  // Register admin account using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(admin);
  // Validate admin profile information
  TestValidator.equals("grade is super", admin.grade, "super");
  TestValidator.equals(
    "display name matches",
    admin.display_name,
    joinInput.display_name,
  );
  TestValidator.predicate("email is valid", admin.email === joinInput.email);
  TestValidator.predicate("has UUID id", admin.id.length > 0);
  // Validate authorization tokens
  TestValidator.predicate("has access token", admin.token.access.length > 0);
  TestValidator.predicate("has refresh token", admin.token.refresh.length > 0);
  TestValidator.predicate("has expired_at", admin.token.expired_at.length > 0);
  TestValidator.predicate(
    "has refreshable_until",
    admin.token.refreshable_until.length > 0,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    admin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    admin.updated_at.length > 0,
  );
  TestValidator.predicate("deleted_at is null", admin.deleted_at === null);
}
