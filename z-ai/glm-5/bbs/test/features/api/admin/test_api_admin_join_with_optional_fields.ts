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

export async function test_api_admin_join_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test data with all optional fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = "Administrator John";
  const bio = "System administrator for the discussion board";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Call admin join API with all optional fields
  const admin = await api.functional.discussionBoard.auth.admin.join(
    connection,
    {
      body: {
        email,
        password,
        display_name: displayName,
        bio,
        href,
        referrer,
        ip,
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Verify response fields match submitted values
  TestValidator.equals("email matches", admin.email, email);
  TestValidator.equals(
    "displayName matches submitted display_name",
    admin.displayName,
    displayName,
  );
  TestValidator.equals("bio matches", admin.bio, bio);
  TestValidator.equals(
    "grade is regular for new admin",
    admin.grade,
    "regular",
  );
  TestValidator.equals(
    "bannedAt is null for new account",
    admin.bannedAt,
    null,
  );
  TestValidator.equals(
    "banReason is null for new account",
    admin.banReason,
    null,
  );
  TestValidator.equals(
    "deletedAt is null for new account",
    admin.deletedAt,
    null,
  );
  TestValidator.predicate(
    "token.access is not empty",
    admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is not empty",
    admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid date",
    new Date(admin.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid date",
    new Date(admin.token.refreshable_until) > new Date(),
  );
}
