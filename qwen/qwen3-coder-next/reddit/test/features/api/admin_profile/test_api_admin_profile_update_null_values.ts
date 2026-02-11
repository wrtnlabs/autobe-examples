import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_profile_update_null_values(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin user
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random admin data
  const initialAdminData = {
    email:
      RandomGenerator.alphabets(6) +
      "@" +
      RandomGenerator.alphabets(5) +
      ".com",
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: RandomGenerator.name() + ".png",
  };
  // Create admin
  const createdAdmin = await api.functional.redditPlatform.admins.update(
    adminConnection,
    {
      adminId: typia.random<string>(),
      body: initialAdminData,
    } satisfies Parameters<
      typeof api.functional.redditPlatform.admins.update
    >[1],
  );
  typia.assert(createdAdmin);
  // Verify initial values are set
  TestValidator.equals(
    "initial display_name set",
    createdAdmin.displayName,
    initialAdminData.display_name,
  );
  TestValidator.equals(
    "initial bio set",
    createdAdmin.bio,
    initialAdminData.bio,
  );
  TestValidator.equals(
    "initial avatar_url set",
    createdAdmin.avatarUrl,
    initialAdminData.avatar_url,
  );
  // Step 2: Update admin profile with null values
  const nullUpdateData = {
    display_name: null,
    bio: null,
    avatar_url: null,
  };
  const updatedAdmin = await api.functional.redditPlatform.admins.update(
    adminConnection,
    {
      adminId: createdAdmin.id,
      body: nullUpdateData,
    },
  );
  typia.assert(updatedAdmin);
  // Step 3: Verify null values are properly set
  TestValidator.equals(
    "display_name is null after update",
    updatedAdmin.displayName,
    null,
  );
  TestValidator.equals("bio is null after update", updatedAdmin.bio, null);
  TestValidator.equals(
    "avatar_url is null after update",
    updatedAdmin.avatarUrl,
    null,
  );
  // Step 4: Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed after null update",
    createdAdmin.updatedAt,
    updatedAdmin.updatedAt,
  );
  // Step 5: Verify the admin record still exists and has correct id
  TestValidator.equals(
    "admin id remains the same",
    updatedAdmin.id,
    createdAdmin.id,
  );
  // Step 6: Verify other fields remain unchanged
  TestValidator.equals(
    "email unchanged",
    updatedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "username unchanged",
    updatedAdmin.username,
    createdAdmin.username,
  );
  TestValidator.equals(
    "karmaScore unchanged",
    updatedAdmin.karmaScore,
    createdAdmin.karmaScore,
  );
}
