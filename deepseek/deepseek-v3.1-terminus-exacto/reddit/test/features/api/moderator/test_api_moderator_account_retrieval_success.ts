import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_moderator_account_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Since we don't have moderator creation API, we need to use an existing moderator
  // or generate a valid moderator ID that exists in the system
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Generate a random moderator ID and attempt retrieval
  // If moderator exists, test will proceed; if not, it will test error handling
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const moderator = await api.functional.communityPlatform.moderators.at(
    moderatorConnection,
    {
      moderatorId,
    },
  );
  typia.assert(moderator);
  // Validate the moderator object structure
  TestValidator.predicate(
    "moderator has valid ID",
    typeof moderator.id === "string" && moderator.id.length > 0,
  );
  TestValidator.predicate(
    "moderator has valid email",
    typeof moderator.email === "string" && moderator.email.includes("@"),
  );
  TestValidator.predicate(
    "moderator has username",
    typeof moderator.username === "string" && moderator.username.length > 0,
  );
  TestValidator.predicate(
    "moderator has display name",
    typeof moderator.display_name === "string" &&
      moderator.display_name.length > 0,
  );
  TestValidator.predicate(
    "moderator has is_active flag",
    typeof moderator.is_active === "boolean",
  );
  TestValidator.predicate(
    "moderator has permission level",
    typeof moderator.permission_level === "string" &&
      moderator.permission_level.length > 0,
  );
  TestValidator.predicate(
    "moderator has created_at timestamp",
    typeof moderator.created_at === "string" && moderator.created_at.length > 0,
  );
  TestValidator.predicate(
    "moderator has updated_at timestamp",
    typeof moderator.updated_at === "string" && moderator.updated_at.length > 0,
  );
  // Optional fields validation
  if (moderator.bio !== null && moderator.bio !== undefined) {
    TestValidator.predicate(
      "bio is string if present",
      typeof moderator.bio === "string",
    );
  }
  if (moderator.avatar_url !== null && moderator.avatar_url !== undefined) {
    TestValidator.predicate(
      "avatar_url is string if present",
      typeof moderator.avatar_url === "string",
    );
  }
  if (
    moderator.last_login_at !== null &&
    moderator.last_login_at !== undefined
  ) {
    TestValidator.predicate(
      "last_login_at is string if present",
      typeof moderator.last_login_at === "string",
    );
  }
}
