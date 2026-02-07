import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
 * Test the successful retrieval of a specific comment rate limit record by a super administrator.
 * 1. Authenticate a super administrator using the join endpoint
 * 2. Retrieve a specific rate limit record by ID
 * 3. Validate the response contains complete rate limit record with user information
 * 4. Verify all required fields are present including user summary object
 */
export async function test_api_super_admin_comment_rate_limit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  // Retrieve a specific rate limit record
  const rateLimitId = typia.random<string & tags.Format<"uuid">>();
  const rateLimit =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.at(
      superAdminConnection,
      {
        rateLimitId: rateLimitId,
      },
    );
  typia.assert(rateLimit);
  // Validate the response structure
  TestValidator.equals("rate limit ID matches", rateLimit.id, rateLimitId);
  TestValidator.predicate(
    "submitted_at is valid date-time",
    new Date(rateLimit.submitted_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(rateLimit.created_at).toString() !== "Invalid Date",
  );
  // Validate user summary object
  TestValidator.predicate("user object exists", rateLimit.user !== undefined);
  TestValidator.equals("user ID is UUID", typeof rateLimit.user.id, "string");
  TestValidator.predicate(
    "display_name is string",
    typeof rateLimit.user.display_name === "string",
  );
  TestValidator.predicate(
    "bio can be string or null",
    rateLimit.user.bio === null || typeof rateLimit.user.bio === "string",
  );
  TestValidator.predicate(
    "user created_at is valid date-time",
    new Date(rateLimit.user.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "user updated_at is valid date-time",
    new Date(rateLimit.user.updated_at).toString() !== "Invalid Date",
  );
}
