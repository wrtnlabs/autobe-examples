import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator registration with optional profile fields.
 * Validates that a new administrator account is created with display_name and bio,
 * confirms 'regular' grade assignment, and verifies authorization tokens.
 */
export async function test_api_administrator_join_with_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Prepare registration data with optional profile fields
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: displayName,
    bio: bio,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  // 3. Register administrator using utility function
  const administrator = await authorize_administrator_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(administrator);
  // 4. Validate response contains all expected fields
  TestValidator.equals(
    "email matches input",
    administrator.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display_name matches input",
    administrator.display_name,
    displayName,
  );
  TestValidator.equals("bio matches input", administrator.bio, bio);
  TestValidator.equals(
    "grade is regular by default",
    administrator.grade,
    "regular",
  );
  TestValidator.predicate(
    "created_at is valid",
    administrator.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    administrator.updated_at.length > 0,
  );
  TestValidator.equals("account is active", administrator.deleted_at, null);
  // 5. Validate authorization tokens
  TestValidator.predicate(
    "access token exists",
    administrator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    administrator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid",
    administrator.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    administrator.token.refreshable_until.length > 0,
  );
}
