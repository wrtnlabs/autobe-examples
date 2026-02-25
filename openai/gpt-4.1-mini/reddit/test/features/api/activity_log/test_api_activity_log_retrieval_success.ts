import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_activity_logs_create } from "../../../generate/generate_random_community_platform_admin_activity_logs_create";
import { prepare_random_community_platform_activity_log } from "../../../prepare/prepare_random_community_platform_activity_log";

export async function test_api_activity_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test successful retrieval of an activity log entry by an authorized admin user.
  // The test first creates a new activity log entry using the POST /communityPlatform/admin/activityLogs endpoint as a prerequisite.
  // Then, it retrieves the activity log by its UUID through the GET /communityPlatform/admin/activityLogs/{id} endpoint.
  // Verify that the response status is 200 OK, and the response body fully matches the ICommunityPlatformActivityLog schema with correct field values such as action_type, timestamps, and user summary if present.
  // Assertions check the presence of expected fields and timestamps.
  // Ensure proper admin role authorization through authentication preprocessing.
  // 1. Admin sign up and create an authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuthorized.token.access,
  };
  // 2. Create a new activity log entry via utility function
  const createdLog =
    await generate_random_community_platform_admin_activity_logs_create(
      adminConnection,
      {},
    );
  typia.assert(createdLog);
  // 3. Retrieve the activity log by ID
  const fetchedLog =
    await api.functional.communityPlatform.admin.activityLogs.at(
      adminConnection,
      { id: createdLog.id },
    );
  typia.assert(fetchedLog);
  // 4. Validate fields to match created log
  TestValidator.equals("activity log id", fetchedLog.id, createdLog.id);
  TestValidator.equals(
    "activity log action_type",
    fetchedLog.action_type,
    createdLog.action_type,
  );
  // Timestamps must be equal ISO strings
  TestValidator.equals(
    "activity log created_at",
    fetchedLog.created_at,
    createdLog.created_at,
  );
  TestValidator.equals(
    "activity log updated_at",
    fetchedLog.updated_at,
    createdLog.updated_at,
  );
  // deleted_at is nullable
  TestValidator.equals(
    "activity log deleted_at",
    fetchedLog.deleted_at ?? null,
    createdLog.deleted_at ?? null,
  );
  // Optional fields: ip_address, user_agent, metadata
  TestValidator.equals(
    "activity log ip_address",
    fetchedLog.ip_address ?? null,
    createdLog.ip_address ?? null,
  );
  TestValidator.equals(
    "activity log user_agent",
    fetchedLog.user_agent ?? null,
    createdLog.user_agent ?? null,
  );
  TestValidator.equals(
    "activity log metadata",
    fetchedLog.metadata ?? null,
    createdLog.metadata ?? null,
  );
  // User summary if present
  if (fetchedLog.user !== undefined && fetchedLog.user !== null) {
    // At least id and email must match
    TestValidator.equals(
      "user id",
      fetchedLog.user.id,
      createdLog.user?.id ?? fetchedLog.user.id,
    );
    TestValidator.equals(
      "user email",
      fetchedLog.user.email,
      createdLog.user?.email ?? fetchedLog.user.email,
    );
    TestValidator.predicate(
      "user has username",
      typeof fetchedLog.user.username === "string" &&
        fetchedLog.user.username.length > 0,
    );
    TestValidator.predicate(
      "user has displayName",
      typeof fetchedLog.user.displayName === "string" &&
        fetchedLog.user.displayName.length > 0,
    );
    // bio and avatarUrl can be null
    TestValidator.predicate(
      "user bio is string or null",
      fetchedLog.user.bio === null || typeof fetchedLog.user.bio === "string",
    );
    TestValidator.predicate(
      "user avatarUrl is string or null",
      fetchedLog.user.avatarUrl === null ||
        typeof fetchedLog.user.avatarUrl === "string",
    );
    // karma must be number
    TestValidator.predicate(
      "user karma is number",
      typeof fetchedLog.user.karma === "number",
    );
    // createdAt, updatedAt, deletedAt timestamps
    TestValidator.predicate(
      "user createdAt is string",
      typeof fetchedLog.user.createdAt === "string" &&
        fetchedLog.user.createdAt.length > 0,
    );
    TestValidator.predicate(
      "user updatedAt is string",
      typeof fetchedLog.user.updatedAt === "string" &&
        fetchedLog.user.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "user deletedAt is string or null",
      fetchedLog.user.deletedAt === null ||
        typeof fetchedLog.user.deletedAt === "string",
    );
  }
}
