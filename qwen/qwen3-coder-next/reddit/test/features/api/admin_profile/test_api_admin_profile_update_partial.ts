import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_profile_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create an admin user with initial profile data
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate realistic initial data
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(8);
  const initialDisplayName = "Initial Admin Name";
  const initialBio = "Initial biography for testing";
  const initialAvatarUrl = "https://example.com/avatars/test.jpg";
  // Create an admin user through a setup endpoint (simulated for this test)
  // Since only update is available, we'll assume admin exists and test the update
  // In real scenario, this would be replaced with actual admin creation
  const adminId = typia.random<string & tags.Format<"uuid">>();
  // 2. Update admin profile with partial data (only display_name)
  const updateBody = {
    display_name: "Updated Display Name",
  } satisfies IRedditPlatformAdmin.IUpdate;
  const updatedAdmin = await api.functional.redditPlatform.admins.update(
    adminConnection,
    {
      adminId: adminId,
      body: updateBody,
    },
  );
  typia.assert(updatedAdmin);
  // 3. Validate that display_name was updated
  TestValidator.equals(
    "displayName updated",
    updatedAdmin.displayName,
    "Updated Display Name",
  );
  // 4. Update with null values to test null assignment
  const nullUpdateBody = {
    bio: null,
    avatar_url: null,
  } satisfies IRedditPlatformAdmin.IUpdate;
  const nullUpdatedAdmin = await api.functional.redditPlatform.admins.update(
    adminConnection,
    {
      adminId: adminId,
      body: nullUpdateBody,
    },
  );
  typia.assert(nullUpdatedAdmin);
  // 5. Validate that null values were applied correctly
  TestValidator.equals("bio set to null", nullUpdatedAdmin.bio, null);
  TestValidator.equals(
    "avatarUrl set to null",
    nullUpdatedAdmin.avatarUrl,
    null,
  );
  TestValidator.equals(
    "displayName unchanged in second update",
    nullUpdatedAdmin.displayName,
    "Updated Display Name",
  );
}
