import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserQuota } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserQuota";

/**
 * Test retrieval of quota information when users access their own quota data.
 * Validates that the security model correctly allows users to view their own
 * quota information while maintaining appropriate access controls for
 * user-scoped data queries in the context of multi-user system operations.
 *
 * This test validates:
 *
 * 1. User can successfully retrieve their own quota information
 * 2. Quota data contains valid structure and fields
 * 3. Authorization is properly maintained for user-scoped data access
 * 4. The quota retrieval operation completes with proper user authentication
 * 5. Current usage values remain within defined maximum limits
 */
export async function test_api_user_quota_retrieval_oneself_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and establish authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userIP = typia.random<string & tags.Format<"ipv4">>();

  const joinRequestBody = {
    email: userEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    ip: userIP,
    href: "https://todoapp.example.com/register",
    referrer: "https://todoapp.example.com",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinRequestBody,
  });
  typia.assert(user);

  TestValidator.predicate("user created successfully", user.id !== null);
  TestValidator.equals("user email matches input", user.email, userEmail);

  // Step 2: Retrieve the user's own quota information
  const userQuota = await api.functional.todoApp.user.userQuotas.user.at(
    connection,
    {
      userId: user.id,
    },
  );
  typia.assert(userQuota);

  // Step 3: Validate the quota data structure and content
  TestValidator.predicate(
    "quota has valid ID",
    userQuota.id !== null && userQuota.id.length > 0,
  );
  TestValidator.equals(
    "quota belongs to correct user",
    userQuota.todo_app_user_id,
    user.id,
  );
  TestValidator.predicate(
    "quota max tasks within acceptable range",
    userQuota.max_tasks >= 0 && userQuota.max_tasks <= 10000,
  );
  TestValidator.predicate(
    "quota max categories within acceptable range",
    userQuota.max_categories >= 0 && userQuota.max_categories <= 500,
  );
  TestValidator.predicate(
    "quota daily limit within acceptable range",
    userQuota.max_daily_task_creations >= 1 &&
      userQuota.max_daily_task_creations <= 1000,
  );
  TestValidator.predicate(
    "quota current task count is valid",
    userQuota.current_task_count >= 0,
  );
  TestValidator.predicate(
    "quota current category count is valid",
    userQuota.current_category_count >= 0,
  );
  TestValidator.predicate(
    "quota daily creation count is valid",
    userQuota.daily_task_creation_count >= 0,
  );
  TestValidator.predicate(
    "premium status is boolean",
    typeof userQuota.is_premium === "boolean",
  );
  TestValidator.predicate(
    "quota has creation timestamp",
    userQuota.created_at !== null,
  );
  TestValidator.predicate(
    "quota has update timestamp",
    userQuota.updated_at !== null,
  );

  // Step 4: Validate usage limits compliance
  TestValidator.predicate(
    "current task count does not exceed maximum",
    userQuota.current_task_count <= userQuota.max_tasks,
  );
  TestValidator.predicate(
    "current category count does not exceed maximum",
    userQuota.current_category_count <= userQuota.max_categories,
  );
  TestValidator.predicate(
    "daily creation count does not exceed daily limit",
    userQuota.daily_task_creation_count <= userQuota.max_daily_task_creations,
  );

  // Step 5: Validate the user summary information in the quota
  TestValidator.predicate(
    "quota contains user summary",
    userQuota.user !== null && userQuota.user !== undefined,
  );
  TestValidator.equals(
    "user summary has correct ID",
    userQuota.user.id,
    user.id,
  );
  TestValidator.equals(
    "user summary has correct email",
    userQuota.user.email,
    userEmail,
  );
  TestValidator.predicate(
    "user summary has creation timestamp",
    userQuota.user.created_at !== null,
  );
  TestValidator.predicate(
    "user summary has update timestamp",
    userQuota.user.updated_at !== null,
  );

  // Step 6: Verify constraints on optional timestamp fields
  if (
    userQuota.user.deleted_at !== null &&
    userQuota.user.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at has valid date format",
      userQuota.user.deleted_at.includes("T"),
    );
  }

  if (
    userQuota.quota_reset_date !== null &&
    userQuota.quota_reset_date !== undefined
  ) {
    TestValidator.predicate(
      "quota_reset_date has valid date format",
      userQuota.quota_reset_date.includes("T"),
    );
  }
}
