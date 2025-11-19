import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_weak_password(
  connection: api.IConnection,
) {
  /**
   * Test 1: Password with only lowercase letters Should be rejected because it
   * lacks uppercase, number, and special character
   */
  await TestValidator.error(
    "should reject password with only lowercase letters",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<50> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          password: "abcdefgh", // only lowercase
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  /**
   * Test 2: Password without special character Should be rejected because it
   * lacks special character
   */
  await TestValidator.error(
    "should reject password without special character",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<50> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          password: "Abcdefgh1", // uppercase, lowercase, number but no special char
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  /**
   * Test 3: Password shorter than 8 characters Should be rejected because it
   * fails minimum length requirement
   */
  await TestValidator.error(
    "should reject password shorter than 8 characters",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<50> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          password: "Abc1!", // only 5 characters
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  /**
   * Test 4: Password without number Should be rejected because it lacks a
   * numeric character
   */
  await TestValidator.error(
    "should reject password without number",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<50> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          password: "Abcdefgh!", // uppercase, lowercase, special but no number
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  /**
   * Test 5: Password without uppercase letter Should be rejected because it
   * lacks an uppercase character
   */
  await TestValidator.error(
    "should reject password without uppercase letter",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<50> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          password: "abcdefgh1!", // lowercase, number, special but no uppercase
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  /**
   * Test 6: Verify that a strong password is accepted Should succeed with a
   * password meeting all complexity requirements
   */
  const strongPassword = "StrongPass123!"; // uppercase, lowercase, number, special, 14 chars
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: strongPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.predicate(
    "strong password should be accepted and return authorized moderator",
    moderator.email !== undefined &&
      moderator.username !== undefined &&
      moderator.id !== undefined,
  );
}
