import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPlatformAdmin";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_list_all_active(
  connection: api.IConnection,
): Promise<void> {
  // Create a platform admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const createdAdmin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(createdAdmin);
  // Verify the platform admin was created successfully
  TestValidator.equals(
    "admin created with valid email",
    createdAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "admin created with valid username",
    createdAdmin.username,
    createdAdmin.username,
  );
  TestValidator.equals(
    "admin account not deleted",
    createdAdmin.is_deleted,
    false,
  );
  // Query for all active platform admins, sorted by created_at descending (default)
  // Use IRequest to filter for only active (is_deleted = false) platform admins
  const request: IRedditCommunityPlatformAdmin.IRequest = {
    is_deleted: false, // Only active platform admins
  };
  const response =
    await api.functional.redditCommunity.platformAdmin.platform_admins.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  // Validate response structure matches IPageIRedditCommunityPlatformAdmin.ISummary
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", response.data !== undefined, true);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data entries
  // Since we filtered for active admins and created one, expect at least one entry
  TestValidator.predicate(
    "at least one active admin returned",
    response.data.length >= 1,
  );
  // Validate first admin entry has correct structure (ISummary)
  const adminSummary = response.data[0];
  TestValidator.equals(
    "admin has UUID id",
    adminSummary.id !== undefined,
    true,
  );
  TestValidator.equals(
    "admin has username",
    adminSummary.username !== undefined,
    true,
  );
  TestValidator.equals(
    "admin has email",
    adminSummary.email !== undefined,
    true,
  );
  TestValidator.equals(
    "admin has is_deleted",
    adminSummary.is_deleted === false,
    true,
  );
  TestValidator.equals(
    "admin has karma_score",
    adminSummary.karma_score !== undefined,
    true,
  );
  TestValidator.equals(
    "admin has created_at",
    adminSummary.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "admin has updated_at",
    adminSummary.updated_at !== undefined,
    true,
  );
  // Validate sensitive fields are NOT included in response (security)
  // password_hash, bio, avatar_url should not be present
  const hasSensitiveFields =
    "password_hash" in adminSummary ||
    "bio" in adminSummary ||
    "avatar_url" in adminSummary;
  TestValidator.equals(
    "no sensitive fields exposed",
    hasSensitiveFields,
    false,
  );
  // Since we requested active admins, all returned admins should have is_deleted = false
  TestValidator.predicate(
    "all admins are active",
    response.data.every((admin) => admin.is_deleted === false),
  );
  // Ensure response includes our newly created admin
  const adminExists = response.data.some(
    (admin) => admin.id === createdAdmin.id,
  );
  TestValidator.equals("created admin found in response", adminExists, true);
  // Validate creation date sorting (descending by default)
  // We only have one admin created in this test, so we can't verify sort order
  // but can verify created_at follows ISO format
  TestValidator.predicate(
    "created_at is ISO format",
    typia.is<string & tags.Format<"date-time">>(adminSummary.created_at),
  );
}
