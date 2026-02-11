import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for profile update testing
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate test data for admin profile update
  const updateBody = {
    display_name: RandomGenerator.name(3),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    avatar_url: "https://example.com/avatar.png",
  } satisfies IRedditPlatformAdmin.IUpdate;
  // Create admin user first (using direct admin creation endpoint if available)
  // Since no admin registration endpoint is documented, we'll use the update endpoint
  // directly with a pre-created admin account ID
  // In real scenario, this would be obtained through proper admin registration workflow
  // For testing purposes, we'll assume an admin account exists with a known ID
  // In production, this would come from proper authentication flow
  const testAdminId = typia.random<string & tags.Format<"uuid">>();
  // Update admin profile
  const updatedAdmin = await api.functional.redditPlatform.admins.update(
    adminConnection,
    {
      adminId: testAdminId,
      body: updateBody,
    },
  );
  typia.assert(updatedAdmin);
  // Validate updated profile fields
  TestValidator.equals(
    "display_name updated",
    updatedAdmin.displayName,
    updateBody.display_name,
  );
  TestValidator.equals("bio updated", updatedAdmin.bio, updateBody.bio);
  TestValidator.equals(
    "avatar_url updated",
    updatedAdmin.avatarUrl,
    updateBody.avatar_url,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(updatedAdmin.id),
  );
  TestValidator.predicate(
    "email format valid",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedAdmin.email),
  );
  TestValidator.predicate(
    "karma score is int32",
    Number.isInteger(updatedAdmin.karmaScore),
  );
  TestValidator.predicate(
    "has valid created_at",
    !isNaN(Date.parse(updatedAdmin.createdAt)),
  );
  TestValidator.predicate(
    "has valid updated_at",
    !isNaN(Date.parse(updatedAdmin.updatedAt!)),
  );
}
