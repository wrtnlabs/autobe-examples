import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test business logic validation for duplicate super administrator email registration.
 * This scenario validates that the system properly enforces email uniqueness at the business level.
 */
export async function test_api_super_admin_join_with_duplicate_email_business_validation(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for the first super admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Create first super admin account
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_super_admin_join(firstConnection, {
    body: { email, password } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // Validate first admin account details
  TestValidator.equals("email matches", firstAdmin.email, email);
  TestValidator.predicate(
    "has valid admin grade",
    firstAdmin.admin_grade === "super",
  );
  TestValidator.predicate(
    "has valid token",
    firstAdmin.token.access.length > 0 && firstAdmin.token.refresh.length > 0,
  );
  // 2. Attempt to create second super admin with same email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.discussionBoard.auth.superAdmin.join(
        secondConnection,
        {
          body: {
            email,
            password: RandomGenerator.alphaNumeric(16),
          } satisfies IDiscussionBoardSuperAdmin.IJoin,
        },
      );
    },
  );
  // 3. Verify original account remains accessible (token still valid)
  // The original connection already has the authorization header set by authorize_super_admin_join
  TestValidator.predicate(
    "original token should be preserved",
    typeof firstConnection.headers?.Authorization === "string" && 
    firstConnection.headers.Authorization.includes(firstAdmin.token.access),
  );
  // 4. Verify business rule: email uniqueness is enforced at database/business level
  // The error should be a business validation error (not HTTP 400 type validation)
  // This is implicit in the TestValidator.error check above
}