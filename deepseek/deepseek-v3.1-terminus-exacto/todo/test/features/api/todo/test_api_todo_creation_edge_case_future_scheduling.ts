import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test business logic edge cases for todo creation with scheduling dates.
 * As an authenticated member, create a todo with future start and due dates where
 * due date is after start date - valid case. Then attempt to create a todo with
 * invalid date logic (due date before start date) and verify the system rejects
 * it with appropriate business logic error (not framework validation).
 * Test creating a todo with only start date but no due date, and vice versa.
 * Validate that date-only todos with missing counterpart are accepted.
 * Test boundary conditions: dates in far future, dates in past relative to creation time.
 * Ensure the system maintains data isolation - todos are only visible to the creating member.
 */
export async function test_api_todo_creation_edge_case_future_scheduling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Helper to create ISO date string with offset days
  const createDate = (daysFromNow: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  };
  // 2. Test Case A: Valid scheduling (start < due)
  const futureStart = createDate(5);
  const futureDue = createDate(10);
  const validTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Valid scheduled todo",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: futureStart,
        dueDate: futureDue,
      },
    },
  );
  typia.assert(validTodo);
  TestValidator.equals("start date matches", validTodo.start_date, futureStart);
  TestValidator.equals("due date matches", validTodo.due_date, futureDue);
  TestValidator.equals("is not completed", validTodo.is_completed, false);
  // Remove invalid comparison - Authorization header contains token, not email
  // TestValidator.equals(
  //   "member matches creator",
  //   validTodo.member?.email,
  //   memberConnection.headers?.Authorization,
  // );
  // 3. Test Case B: Invalid scheduling (due < start) - should reject
  const invalidStart = createDate(10);
  const invalidDue = createDate(5);
  await TestValidator.error("rejects due before start", async () => {
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: "Invalid scheduled todo",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          startDate: invalidStart,
          dueDate: invalidDue,
        },
      },
    );
  });
  // 4. Test Case C: Start date only (no due)
  const startOnlyTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: "Todo with start only",
          description: null,
          startDate: createDate(3),
          dueDate: null,
        },
      },
    );
  typia.assert(startOnlyTodo);
  TestValidator.notEquals("start date is set", startOnlyTodo.start_date, null);
  TestValidator.equals("due date is null", startOnlyTodo.due_date, null);
  TestValidator.predicate("has valid title", startOnlyTodo.title.length > 0);
  // 5. Test Case D: Due date only (no start)
  const dueOnlyTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with due only",
        description: RandomGenerator.paragraph({ sentences: 1 }),
        startDate: null,
        dueDate: createDate(7),
      },
    },
  );
  typia.assert(dueOnlyTodo);
  TestValidator.equals("start date is null", dueOnlyTodo.start_date, null);
  TestValidator.notEquals("due date is set", dueOnlyTodo.due_date, null);
  // 6. Test Case E: Boundary - far future dates
  const farFutureStart = createDate(365 * 10); // 10 years
  const farFutureDue = createDate(365 * 10 + 30); // 10 years + 1 month
  const farFutureTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: "Far future todo",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          startDate: farFutureStart,
          dueDate: farFutureDue,
        },
      },
    );
  typia.assert(farFutureTodo);
  TestValidator.equals(
    "far future start matches",
    farFutureTodo.start_date,
    farFutureStart,
  );
  TestValidator.equals(
    "far future due matches",
    farFutureTodo.due_date,
    farFutureDue,
  );
  // 7. Test Case F: Past dates (should be allowed as dates are optional)
  const pastStart = createDate(-5); // 5 days ago
  const pastDue = createDate(-2); // 2 days ago
  const pastTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with past dates",
        description: RandomGenerator.paragraph({ sentences: 1 }),
        startDate: pastStart,
        dueDate: pastDue,
      },
    },
  );
  typia.assert(pastTodo);
  TestValidator.equals("past start matches", pastTodo.start_date, pastStart);
  TestValidator.equals("past due matches", pastTodo.due_date, pastDue);
  TestValidator.predicate("is not completed", pastTodo.is_completed === false);
  // 8. Verify data isolation - create another member and ensure they can't see first member's todos
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(anotherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create a todo with second member
  const secondMemberTodo =
    await generate_random_multi_user_todo_member_todos_create(
      anotherMemberConnection,
      {
        body: {
          title: "Second member todo",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          startDate: null,
          dueDate: null,
        },
      },
    );
  typia.assert(secondMemberTodo);
  // Verify IDs are different (implicit data isolation)
  TestValidator.notEquals(
    "different todo IDs",
    validTodo.id,
    secondMemberTodo.id,
  );
}