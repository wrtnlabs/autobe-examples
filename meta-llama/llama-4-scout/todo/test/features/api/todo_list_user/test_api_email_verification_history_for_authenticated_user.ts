import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";

/**
 * Validate retrieval of authenticated user's full email verification event
 * history.
 *
 * 1. Register a new user (which triggers initial verification event generation)
 * 2. As the authenticated user, fetch their email verification history
 * 3. Assert that at least an initial event exists, and its fields match
 *    ITodoListUserEmailVerification.ISummary
 * 4. Assert no events from other users are present
 */
export async function test_api_email_verification_history_for_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://app.todo.local/register",
    referrer: "https://app.todo.local/",
  } satisfies ITodoListUser.IJoin;

  const joinResult = await api.functional.auth.user.join(connection, {
    body: registrationBody,
  });
  typia.assert(joinResult);

  // 2. Retrieve email verification event history as authenticated user
  const verificationPage =
    await api.functional.todoList.user.users.me.emailVerifications.index(
      connection,
      { body: {} satisfies ITodoListUserEmailVerification.IRequest },
    );
  typia.assert(verificationPage);
  const events = verificationPage.data;

  // 3. Assert at least one event exists
  TestValidator.predicate(
    "at least one verification event exists",
    events.length >= 1,
  );

  // 4. Assert all event fields match ITodoListUserEmailVerification.ISummary
  for (const event of events) {
    typia.assert<ITodoListUserEmailVerification.ISummary>(event);
    TestValidator.predicate(
      "verification_token should be a non-empty string",
      typeof event.verification_token === "string" &&
        event.verification_token.length > 0,
    );
    TestValidator.predicate(
      "expires_at should be an ISO string",
      typeof event.expires_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T/.test(event.expires_at),
    );
  }

  // 5. (Optional) Assert events belong to this user only – not strictly possible from event object without user id, so omitted unless exposed
}
