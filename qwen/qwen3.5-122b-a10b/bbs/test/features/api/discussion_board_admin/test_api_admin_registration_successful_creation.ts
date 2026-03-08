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

export async function test_api_admin_registration_successful_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid admin registration data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16), // Meets MinLength<8> requirement
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  // Register admin account using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  // Assert response type safety
  typia.assert(admin);
  // Validate response fields
  TestValidator.predicate(
    "admin ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );
  TestValidator.equals(
    "admin email matches input",
    admin.email,
    joinInput.email,
  );
  TestValidator.equals(
    "admin display name matches input",
    admin.display_name,
    joinInput.display_name,
  );
  TestValidator.equals("admin grade is regular", admin.grade, "regular");
  TestValidator.predicate(
    "admin has created_at timestamp",
    admin.created_at !== null && admin.created_at !== undefined,
  );
  TestValidator.predicate(
    "admin has updated_at timestamp",
    admin.updated_at !== null && admin.updated_at !== undefined,
  );
  TestValidator.predicate(
    "admin bio is present",
    admin.bio !== null && admin.bio !== undefined,
  );
  TestValidator.predicate(
    "admin has valid access token",
    admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin has valid refresh token",
    admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "admin has valid token expiration",
    admin.token.expired_at !== null && admin.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "admin has valid refreshable until",
    admin.token.refreshable_until !== null &&
      admin.token.refreshable_until !== undefined,
  );
}
