import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_moderator_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorization step is hypothetical and should be implemented if utility functions are available
  // For testing purpose, assume adminConnection is authorized
  // To ensure a valid moderator ID, use simulate mode to get a mock moderator profile
  // Then use the returned id to fetch actual profile
  if (connection.simulate === true) {
    // In simulate mode, get a random moderator ID and test retrieval
    const simulatedModerator =
      await api.functional.communityPlatform.moderators.at(adminConnection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    typia.assert(simulatedModerator);
    const moderatorProfile =
      await api.functional.communityPlatform.moderators.at(adminConnection, {
        id: simulatedModerator.id,
      });
    typia.assert(moderatorProfile);
    // Validate fields
    TestValidator.equals(
      "moderator id",
      moderatorProfile.id,
      simulatedModerator.id,
    );
    TestValidator.predicate(
      "email is string",
      typeof moderatorProfile.email === "string" &&
        moderatorProfile.email.length > 0,
    );
    TestValidator.predicate(
      "username is string",
      typeof moderatorProfile.username === "string" &&
        moderatorProfile.username.length > 0,
    );
    if (
      moderatorProfile.displayName !== undefined &&
      moderatorProfile.displayName !== null
    ) {
      TestValidator.predicate(
        "displayName is string if present",
        typeof moderatorProfile.displayName === "string",
      );
    }
    if (moderatorProfile.bio !== undefined && moderatorProfile.bio !== null) {
      TestValidator.predicate(
        "bio is string if present",
        typeof moderatorProfile.bio === "string",
      );
    }
    if (
      moderatorProfile.avatarUrl !== undefined &&
      moderatorProfile.avatarUrl !== null
    ) {
      TestValidator.predicate(
        "avatarUrl is string if present",
        typeof moderatorProfile.avatarUrl === "string",
      );
    }
    TestValidator.predicate(
      "karma is int",
      Number.isInteger(moderatorProfile.karma),
    );
    TestValidator.predicate(
      "createdAt is ISO datetime",
      typeof moderatorProfile.createdAt === "string" &&
        !isNaN(Date.parse(moderatorProfile.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is ISO datetime",
      typeof moderatorProfile.updatedAt === "string" &&
        !isNaN(Date.parse(moderatorProfile.updatedAt)),
    );
    if (
      moderatorProfile.deletedAt !== undefined &&
      moderatorProfile.deletedAt !== null
    ) {
      TestValidator.predicate(
        "deletedAt is ISO datetime if present",
        typeof moderatorProfile.deletedAt === "string" &&
          !isNaN(Date.parse(moderatorProfile.deletedAt)),
      );
    } else {
      TestValidator.predicate(
        "deletedAt is null or undefined",
        moderatorProfile.deletedAt === null ||
          moderatorProfile.deletedAt === undefined,
      );
    }
  } else {
    // If not simulate mode, we cannot guarantee presence of valid moderator ID without creation
    // So, skip or throw error
    throw new Error(
      "Test skipped: No simulate mode and no available moderator creation endpoint.",
    );
  }
}
