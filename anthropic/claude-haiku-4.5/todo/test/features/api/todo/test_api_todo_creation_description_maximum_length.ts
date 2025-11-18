import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating todos with descriptions at various lengths to validate the
 * maximum length constraint of 5000 characters.
 *
 * This test ensures that the todo creation API properly validates description
 * field constraints by testing boundary conditions:
 *
 * - Minimum length descriptions (1 character)
 * - Medium length descriptions (100 characters)
 * - Large length descriptions (1000 characters)
 * - Maximum allowed descriptions (5000 characters)
 * - Descriptions exceeding the maximum (should be rejected)
 * - Null/omitted descriptions (should be handled correctly)
 *
 * The test verifies both successful creation with valid descriptions and proper
 * rejection of descriptions that exceed the 5000 character limit.
 */
export async function test_api_todo_creation_description_maximum_length(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user for testing todo creation
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Test todo creation with 1 character description (minimum)
  const singleCharDescription = "A";
  const todoWithSingleChar = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Single character description test",
        description: singleCharDescription,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todoWithSingleChar);
  TestValidator.equals(
    "single character description stored correctly",
    todoWithSingleChar.description,
    singleCharDescription,
  );

  // Step 3: Test todo creation with 100 character description
  const hundredCharDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 100);
  const todoWithHundredChars = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Hundred character description test",
        description: hundredCharDescription,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todoWithHundredChars);
  TestValidator.equals(
    "hundred character description stored correctly",
    todoWithHundredChars.description,
    hundredCharDescription,
  );

  // Step 4: Test todo creation with 1000 character description
  const thousandCharDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 7,
  }).substring(0, 1000);
  const todoWithThousandChars = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Thousand character description test",
        description: thousandCharDescription,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todoWithThousandChars);
  TestValidator.equals(
    "thousand character description stored correctly",
    todoWithThousandChars.description,
    thousandCharDescription,
  );

  // Step 5: Test todo creation with maximum 5000 character description
  const maxCharDescription = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 5000);
  const todoWithMaxChars = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Maximum character description test",
        description: maxCharDescription,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todoWithMaxChars);
  TestValidator.equals(
    "maximum 5000 character description stored correctly",
    todoWithMaxChars.description,
    maxCharDescription,
  );

  // Step 6: Test todo creation with description exceeding 5000 characters (should fail)
  const exceedingCharDescription = RandomGenerator.content({
    paragraphs: 15,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 9,
  }).substring(0, 5001);

  await TestValidator.error(
    "description exceeding 5000 characters should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: "Exceeding character description test",
          description: exceedingCharDescription,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // Step 7: Test todo creation with null description
  const todoWithNullDescription =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Null description test",
        description: null,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoWithNullDescription);
  TestValidator.equals(
    "null description handled correctly",
    todoWithNullDescription.description,
    null,
  );

  // Step 8: Test todo creation with omitted description
  const todoWithOmittedDescription =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Omitted description test",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoWithOmittedDescription);
}
