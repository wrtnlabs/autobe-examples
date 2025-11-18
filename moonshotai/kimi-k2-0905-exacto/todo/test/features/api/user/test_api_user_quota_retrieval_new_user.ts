import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserQuota } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserQuota";

/**
 * Test retrieval of quota information for a newly created user account.
 * Validates that the REST API correctly returns default quota limits (1000 max
 * tasks, 100 max categories, 30 daily task creations), zero usage counters, and
 * appropriate metadata for fresh user accounts.
 *
 * 1. Create a new user account through the registration endpoint
 * 2. Retrieve quota details for the newly created user
 * 3. Validate that all quota limits match expected default values
 * 4. Verify that usage counters are all zero for the fresh account
 * 5. Check that the quota structure contains all expected fields
 * 6. Validate the user relationship and metadata information
 */
export async function test_api_user_quota_retrieval_new_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: email,
    password: "TestPassword123",
    ip: "127.0.0.1",
    href: "https://example.com/todoapp",
    referrer: "https://google.com",
  } satisfies ITodoAppUser.IJoin;

  const newUser = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(newUser);

  TestValidator.equals(
    "email matches registration email",
    newUser.email,
    email,
  );

  // Step 2: Retrieve quota details for the new user
  const quota = await api.functional.todoApp.user.userQuotas.user.at(
    connection,
    {
      userId: newUser.id,
    },
  );
  typia.assert(quota);

  // Step 3: Validate quota limits match expected defaults
  TestValidator.equals("max_tasks matches default", quota.max_tasks, 1000);
  TestValidator.equals(
    "max_categories matches default",
    quota.max_categories,
    100,
  );
  TestValidator.equals(
    "max_daily_task_creations matches default",
    quota.max_daily_task_creations,
    30,
  );

  // Step 4: Verify usage counters are all zero for fresh account
  TestValidator.equals(
    "current_task_count is zero for new user",
    quota.current_task_count,
    0,
  );
  TestValidator.equals(
    "current_category_count is zero for new user",
    quota.current_category_count,
    0,
  );
  TestValidator.equals(
    "daily_task_creation_count is zero for new user",
    quota.daily_task_creation_count,
    0,
  );

  // Step 5: Validate that this is a standard user (not premium)
  TestValidator.equals(
    "is_premium is false for new user",
    quota.is_premium,
    false,
  );

  // Step 6: Validate user relationship and ID consistency
  TestValidator.equals(
    "quota belongs to correct user",
    quota.todo_app_user_id,
    newUser.id,
  );
  TestValidator.equals(
    "user ID in quota matches join response",
    quota.user.id,
    newUser.id,
  );
  TestValidator.equals(
    "user email in quota matches join response",
    quota.user.email,
    newUser.email,
  );

  // Step 7: Validate user timestamps match join response
  TestValidator.equals(
    "user.created_at matches join response",
    quota.user.created_at,
    newUser.created_at,
  );
  TestValidator.equals(
    "user.email matches join response",
    quota.user.email,
    newUser.email,
  );

  // Step 8: Validate basic field presence (typia.assert already validates formats)
  TestValidator.predicate(
    "quota_reset_date exists",
    quota.quota_reset_date !== null && quota.quota_reset_date !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    quota.created_at !== null && quota.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    quota.updated_at !== null && quota.updated_at !== undefined,
  );
}
