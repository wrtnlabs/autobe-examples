import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  // Use a known valid UUID or simulate it
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Fetch user profile by ID
  const userProfile = await api.functional.communityPlatform.users.at(
    userConnection,
    {
      id: userId,
    },
  );
  typia.assert(userProfile);
  // Check that password hash or similar sensitive data is not present is implicit by DTO structure
  // Validate mandatory fields
  TestValidator.predicate(
    "email is non-empty string",
    typeof userProfile.email === "string" && userProfile.email.length > 0,
  );
  TestValidator.predicate(
    "username is non-empty string",
    typeof userProfile.username === "string" && userProfile.username.length > 0,
  );
  TestValidator.predicate(
    "display_name is non-empty string",
    typeof userProfile.display_name === "string" &&
      userProfile.display_name.length > 0,
  );
  TestValidator.predicate(
    "karma is number",
    typeof userProfile.karma === "number",
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(userProfile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(userProfile.updated_at)),
  );
  // bio and avatar_url can be null or string
  TestValidator.predicate(
    "bio is null or string",
    userProfile.bio === null || typeof userProfile.bio === "string",
  );
  TestValidator.predicate(
    "avatar_url is null or string",
    userProfile.avatar_url === null ||
      typeof userProfile.avatar_url === "string",
  );
  // deleted_at can be null or valid ISO date-time
  TestValidator.predicate(
    "deleted_at is null or valid ISO date-time",
    userProfile.deleted_at === null ||
      !isNaN(Date.parse(userProfile.deleted_at ?? "")),
  );
}
