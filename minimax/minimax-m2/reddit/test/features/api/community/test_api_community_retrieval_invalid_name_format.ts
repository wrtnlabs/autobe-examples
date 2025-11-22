import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_retrieval_invalid_name_format(
  connection: api.IConnection,
) {
  // Test empty community name
  await TestValidator.error(
    "empty community name should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: "",
      });
    },
  );

  // Test too short community name (less than 2 characters)
  await TestValidator.error(
    "single character community name should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: "a",
      });
    },
  );

  // Test too long community name (more than 25 characters)
  const tooLongName = RandomGenerator.alphaNumeric(26);
  await TestValidator.error(
    "too long community name should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: tooLongName,
      });
    },
  );

  // Test community name with special characters
  await TestValidator.error(
    "community name with special characters should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: "test-community@2024",
      });
    },
  );

  // Test community name with spaces
  await TestValidator.error(
    "community name with spaces should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: "test community",
      });
    },
  );

  // Test community name starting with underscore
  await TestValidator.error(
    "community name starting with underscore should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: "_testcommunity",
      });
    },
  );

  // Test community name with only numbers
  await TestValidator.error(
    "community name with only numbers should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: "123",
      });
    },
  );

  // Test community name with mixed invalid characters
  await TestValidator.error(
    "community name with mixed invalid characters should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: "test@community#2024!",
      });
    },
  );
}
