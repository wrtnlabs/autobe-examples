import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_creation(
  connection: api.IConnection,
) {
  // Generate test user data
  const requestBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;

  // Call API to create registered user
  const createdUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      { body: requestBody },
    );

  // Validate the returned user object
  typia.assert(createdUser);

  // Validate each essential property
  TestValidator.predicate(
    "id has uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdUser.id,
    ),
  );

  TestValidator.equals(
    "username matches request",
    createdUser.username,
    requestBody.username,
  );

  TestValidator.equals(
    "email matches request",
    createdUser.email,
    requestBody.email,
  );

  TestValidator.predicate(
    "status is one of active, inactive, banned",
    createdUser.status === "active" ||
      createdUser.status === "inactive" ||
      createdUser.status === "banned",
  );

  TestValidator.predicate(
    "role is a non-empty string",
    typeof createdUser.role === "string" && createdUser.role.length > 0,
  );

  // Validate registered_at is ISO 8601
  TestValidator.predicate(
    "registered_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      createdUser.registered_at,
    ),
  );

  // Optional nullable fields
  // They can be string or null or undefined - here check that they are string or null or undefined
  if (createdUser.display_name !== undefined) {
    TestValidator.predicate(
      "display_name is string or null",
      createdUser.display_name === null ||
        typeof createdUser.display_name === "string",
    );
  }

  if (createdUser.bio !== undefined) {
    TestValidator.predicate(
      "bio is string or null",
      createdUser.bio === null || typeof createdUser.bio === "string",
    );
  }

  if (createdUser.avatar_url !== undefined) {
    TestValidator.predicate(
      "avatar_url is string or null",
      createdUser.avatar_url === null ||
        typeof createdUser.avatar_url === "string",
    );
  }

  // last_login_at and deleted_at also optional nullable string
  if (createdUser.last_login_at !== undefined) {
    TestValidator.predicate(
      "last_login_at is string or null",
      createdUser.last_login_at === null ||
        typeof createdUser.last_login_at === "string",
    );
  }

  if (createdUser.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is string or null",
      createdUser.deleted_at === null ||
        typeof createdUser.deleted_at === "string",
    );
  }

  // Validate created_at and updated_at timestamps format
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      createdUser.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      createdUser.updated_at,
    ),
  );
}
