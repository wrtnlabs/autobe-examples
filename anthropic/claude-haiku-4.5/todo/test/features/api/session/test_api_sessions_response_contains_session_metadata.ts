import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that session metadata is complete and contains all required fields.
 *
 * This test ensures that when retrieving a user's session list, each session
 * response includes all essential metadata fields for device identification and
 * session management. The test creates a user account (which automatically
 * generates an initial session), then retrieves the sessions list and validates
 * that all required metadata fields are present.
 *
 * Required metadata fields validated:
 *
 * - Id: UUID uniquely identifying the session
 * - Todo_list_user_id: UUID linking to the user account
 * - Ip_address: IP address from which session was established
 * - User_agent: Device/browser identification from HTTP headers
 * - Created_at: Session creation timestamp in ISO 8601 format
 * - Last_activity_at: Timestamp of most recent API request
 * - Absolute_timeout_at: Hard deadline for session validity
 * - Expired_at: Session termination timestamp (null for active, timestamp for
 *   terminated)
 *
 * This validation is critical for security features like multi-device session
 * management, allowing users to view and control their active login sessions.
 */
export async function test_api_sessions_response_contains_session_metadata(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (which creates an initial session)
  const userCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateData,
    });
  typia.assert(authorizedUser);

  // Step 2: Retrieve the user's session list
  const sessionListRequest = {
    page: 1,
    limit: 10,
  } satisfies ITodoListSession.IRequest;

  const sessionListResponse: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: sessionListRequest,
    });
  typia.assert(sessionListResponse);

  // Step 3: Validate that pagination data is present
  TestValidator.predicate(
    "pagination object should exist",
    sessionListResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array should exist",
    sessionListResponse.data !== undefined &&
      Array.isArray(sessionListResponse.data),
  );

  // Step 4: Validate that at least one session exists (from registration)
  TestValidator.predicate(
    "at least one session should exist from registration",
    sessionListResponse.data.length > 0,
  );

  // Step 5: Validate that each session contains all required metadata fields
  await ArrayUtil.asyncForEach(
    sessionListResponse.data,
    async (session: ITodoListSession.ISummary) => {
      // Validate id field (UUID)
      TestValidator.predicate(
        "session id should be a non-empty string",
        typeof session.id === "string" && session.id.length > 0,
      );
      TestValidator.predicate(
        "session id should be valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          session.id,
        ),
      );

      // Validate todo_list_user_id field (UUID)
      TestValidator.predicate(
        "todo_list_user_id should be a non-empty string",
        typeof session.todo_list_user_id === "string" &&
          session.todo_list_user_id.length > 0,
      );
      TestValidator.predicate(
        "todo_list_user_id should be valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          session.todo_list_user_id,
        ),
      );
      TestValidator.equals(
        "todo_list_user_id should match authenticated user id",
        session.todo_list_user_id,
        authorizedUser.id,
      );

      // Validate ip_address field
      TestValidator.predicate(
        "ip_address should be a non-empty string",
        typeof session.ip_address === "string" && session.ip_address.length > 0,
      );

      // Validate user_agent field
      TestValidator.predicate(
        "user_agent should be a non-empty string",
        typeof session.user_agent === "string" && session.user_agent.length > 0,
      );

      // Validate created_at field (ISO 8601 date-time)
      TestValidator.predicate(
        "created_at should be a non-empty string",
        typeof session.created_at === "string" && session.created_at.length > 0,
      );
      TestValidator.predicate(
        "created_at should be valid ISO 8601 date-time format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/.test(
          session.created_at,
        ),
      );

      // Validate last_activity_at field (ISO 8601 date-time)
      TestValidator.predicate(
        "last_activity_at should be a non-empty string",
        typeof session.last_activity_at === "string" &&
          session.last_activity_at.length > 0,
      );
      TestValidator.predicate(
        "last_activity_at should be valid ISO 8601 date-time format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/.test(
          session.last_activity_at,
        ),
      );
      TestValidator.predicate(
        "last_activity_at should be >= created_at",
        new Date(session.last_activity_at) >= new Date(session.created_at),
      );

      // Validate absolute_timeout_at field (ISO 8601 date-time)
      TestValidator.predicate(
        "absolute_timeout_at should be a non-empty string",
        typeof session.absolute_timeout_at === "string" &&
          session.absolute_timeout_at.length > 0,
      );
      TestValidator.predicate(
        "absolute_timeout_at should be valid ISO 8601 date-time format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/.test(
          session.absolute_timeout_at,
        ),
      );
      TestValidator.predicate(
        "absolute_timeout_at should be > created_at (30 day timeout)",
        new Date(session.absolute_timeout_at) > new Date(session.created_at),
      );

      // Validate expired_at field (null for active sessions or ISO 8601 date-time for expired)
      TestValidator.predicate(
        "expired_at should be null or valid ISO 8601 date-time format",
        session.expired_at === null ||
          session.expired_at === undefined ||
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/.test(
            session.expired_at,
          ),
      );

      // If expired_at is set, validate it's after creation
      if (session.expired_at !== null && session.expired_at !== undefined) {
        TestValidator.predicate(
          "expired_at should be >= created_at for terminated sessions",
          new Date(session.expired_at) >= new Date(session.created_at),
        );
      }
    },
  );

  // Step 6: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be >= 1",
    sessionListResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    sessionListResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    sessionListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    sessionListResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length should match pagination records or be limited by limit",
    sessionListResponse.data.length <= sessionListResponse.pagination.records,
  );
}
