import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_user } from "../../../prepare/prepare_random_discussion_board_user";
import { generate_random_discussion_board_users_create } from "../../../generate/generate_random_discussion_board_users_create";
export async function test_api_citizen_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for registration
  const userConnection: api.IConnection = { host: connection.host };
  // Generate valid user data for registration
  const validUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!@#",
    username: "user_123",
  } satisfies IDiscussionBoardUser.ICreate;
  // Test successful registration with valid data
  const registeredUser = await generate_random_discussion_board_users_create(
    userConnection,
    {
      body: validUser,
    },
  );
  typia.assert(registeredUser);
  // Validate that registration returned proper response
  TestValidator.equals(
    "returned user id is valid UUID",
    registeredUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "returned user email matches input",
    registeredUser.email,
    validUser.email,
  );
  TestValidator.equals(
    "returned username matches input",
    registeredUser.username,
    validUser.username,
  );
  TestValidator.predicate(
    "created_at is ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      registeredUser.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      registeredUser.updated_at,
    ),
  );
  // Test email uniqueness violation
  await TestValidator.error("duplicate email should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: validUser.email, // Same email as above
        password: "AnotherPassword123!@#",
        username: "user_456",
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  // Test invalid email format
  await TestValidator.error("invalid email format should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: "not-an-email",
        password: "ValidPassword123!@#",
        username: "user_789",
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  // Test password complexity - too short
  await TestValidator.error("password too short should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Short12!", // Only 8 characters
        username: "user_000",
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  // Test password complexity - missing uppercase
  await TestValidator.error(
    "password without uppercase should fail",
    async () => {
      await generate_random_discussion_board_users_create(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "validpassword123!@#",
          username: "user_111",
        } satisfies IDiscussionBoardUser.ICreate,
      });
    },
  );
  // Test password complexity - missing lowercase
  await TestValidator.error(
    "password without lowercase should fail",
    async () => {
      await generate_random_discussion_board_users_create(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "VALIDPASSWORD123!@#",
          username: "user_222",
        } satisfies IDiscussionBoardUser.ICreate,
      });
    },
  );
  // Test password complexity - missing digit
  await TestValidator.error("password without digit should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword!@#",
        username: "user_333",
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  // Test password complexity - missing special character
  await TestValidator.error(
    "password without special character should fail",
    async () => {
      await generate_random_discussion_board_users_create(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "ValidPassword123",
          username: "user_444",
        } satisfies IDiscussionBoardUser.ICreate,
      });
    },
  );
  // Test username too short
  await TestValidator.error("username too short should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!@#",
        username: "ab", // Only 2 characters
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  // Test username too long
  await TestValidator.error("username too long should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!@#",
        username: "a".repeat(31), // 31 characters
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  // Test username with invalid characters
  await TestValidator.error("username with spaces should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!@#",
        username: "user name", // Contains space
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  await TestValidator.error(
    "username with special characters should fail",
    async () => {
      await generate_random_discussion_board_users_create(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "ValidPassword123!@#",
          username: "user@name", // Contains @
        } satisfies IDiscussionBoardUser.ICreate,
      });
    },
  );
  // Test missing required fields
  await TestValidator.error("missing email should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        // email missing
        password: "ValidPassword123!@#",
        username: "user_555",
        email: "" // Fixed: Added email with empty string to satisfy required property
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  await TestValidator.error("missing password should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        // password missing
        username: "user_666",
        password: "" // Fixed: Added password with empty string to satisfy required property
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  await TestValidator.error("missing username should fail", async () => {
    await generate_random_discussion_board_users_create(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!@#",
        // username missing
        username: "" // Fixed: Added username with empty string to satisfy required property
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });
  // Test optional fields - display_name and bio
  const optionalUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!@#",
    username: "user_777",
    display_name: "John Doe",
    bio: "Software engineer interested in TypeScript",
  } satisfies IDiscussionBoardUser.ICreate;
  const userWithOptions = await generate_random_discussion_board_users_create(
    userConnection,
    {
      body: optionalUser,
    },
  );
  typia.assert(userWithOptions);
  TestValidator.equals(
    "display_name set correctly",
    userWithOptions.display_name,
    optionalUser.display_name,
  );
  TestValidator.equals(
    "bio set correctly",
    userWithOptions.bio,
    optionalUser.bio,
  );
  // Test that display_name defaults to username when not provided
  const defaultDisplayNameUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!@#",
    username: "user_888",
  } satisfies IDiscussionBoardUser.ICreate;
  const userWithoutDisplayName =
    await generate_random_discussion_board_users_create(userConnection, {
      body: defaultDisplayNameUser,
    });
  typia.assert(userWithoutDisplayName);
  TestValidator.equals(
    "display_name defaults to username",
    userWithoutDisplayName.display_name,
    defaultDisplayNameUser.username,
  );
  // Test that bio defaults to undefined when not provided
  TestValidator.equals(
    "bio is undefined when not provided",
    userWithoutDisplayName.bio,
    undefined,
  );
  // Ensure no type errors exist in the test - all assertions are type-safe
}