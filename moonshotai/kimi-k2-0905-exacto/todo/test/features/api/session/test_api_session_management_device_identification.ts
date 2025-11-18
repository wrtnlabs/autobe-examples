import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import type { IRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefreshToken";
import type { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test session search and management capabilities for device identification and
 * cross-device session overview.
 *
 * Validates that users can effectively manage their authentication footprint
 * across multiple devices with proper device categorization, session type
 * differentiation, and comprehensive session metadata display for personal
 * security monitoring. The test creates a user account, generates multiple
 * sessions with different device contexts, and performs comprehensive session
 * filtering and analysis
 *
 * 1. Create primary user account with device identification metadata
 * 2. Create multiple sessions through refresh operations to simulate different
 *    device contexts
 * 3. Create a task to establish user activity baseline
 * 4. Perform comprehensive session searches using device type, session type, and
 *    temporal filters
 * 5. Validate session data includes proper device identification and
 *    authentication context
 * 6. Test pagination for session management across multiple devices
 * 7. Verify authentication footprint monitoring capabilities
 */
export async function test_api_session_management_device_identification(
  connection: api.IConnection,
) {
  // Step 1: Create primary user account with device identification
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create sessions through refresh operations to simulate different contexts
  const session1 = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: user.token.refresh as string &
        tags.MinLength<32> &
        tags.MaxLength<2048>,
    },
  });
  typia.assert(session1);

  const session2 = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: session1.token.refresh as string &
        tags.MinLength<32> &
        tags.MaxLength<2048>,
    },
  });
  typia.assert(session2);

  const session3 = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: session2.token.refresh as string &
        tags.MinLength<32> &
        tags.MaxLength<2048>,
    },
  });
  typia.assert(session3);

  // Step 3: Create a task to satisfy user existence prerequisite
  const task = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: RandomGenerator.name(),
        status: "pending",
        description: RandomGenerator.paragraph(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task);

  // Step 4: Test comprehensive session search with device type filter
  const deviceTypeResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        },
        device_type: "web",
      } satisfies ITodoAppSession.IRequest,
    });
  typia.assert(deviceTypeResults);

  TestValidator.predicate(
    "device type search returns sessions",
    deviceTypeResults.data.length > 0,
  );

  // Step 5: Test session type filtering
  const sessionTypeResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        },
        session_type: "standard",
      } satisfies ITodoAppSession.IRequest,
    });
  typia.assert(sessionTypeResults);

  TestValidator.predicate(
    "session type search returns sessions",
    sessionTypeResults.data.length > 0,
  );

  // Step 6: Test validity status filtering
  const validSessions = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        },
        is_valid: true,
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(validSessions);

  TestValidator.predicate(
    "valid sessions search returns sessions",
    validSessions.data.length > 0,
  );

  // Step 7: Test temporal range filtering
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const temporalResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        },
        created_after: startDate as string & tags.Format<"date-time">,
        expired_before: endDate as string & tags.Format<"date-time">,
      } satisfies ITodoAppSession.IRequest,
    });
  typia.assert(temporalResults);

  TestValidator.predicate(
    "temporal range search returns sessions",
    temporalResults.data.length > 0,
  );

  // Step 8: Test comprehensive search with multiple filters
  const comprehensiveResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: {
          current: 0,
          limit: 5,
          records: 0,
          pages: 0,
        },
        device_type: "web",
        session_type: "standard",
        is_valid: true,
      } satisfies ITodoAppSession.IRequest,
    });
  typia.assert(comprehensiveResults);

  TestValidator.predicate(
    "comprehensive search returns sessions",
    comprehensiveResults.data.length > 0,
  );

  // Step 9: Test pagination functionality
  const paginatedResults =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: {
          current: 1,
          limit: 3,
          records: 0,
          pages: 0,
        },
      } satisfies ITodoAppSession.IRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "paginated search returns sessions",
    paginatedResults.data.length > 0,
  );
  TestValidator.equals(
    "pagination page matches request",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResults.pagination.limit,
    3,
  );

  // Step 10: Validate session data structure and metadata
  const allSessions = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: {
          current: 0,
          limit: 50,
          records: 0,
          pages: 0,
        },
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(allSessions);

  TestValidator.predicate(
    "all sessions search returns data",
    allSessions.data.length > 0,
  );

  // Validate each session has proper device identification and metadata
  for (const session of allSessions.data) {
    TestValidator.predicate(
      "session has user context",
      session.user !== undefined,
    );
    TestValidator.predicate(
      "session has session type",
      session.session_type !== undefined,
    );
    TestValidator.predicate(
      "session has validity status",
      session.is_valid !== undefined,
    );
    TestValidator.predicate(
      "session has creation timestamp",
      session.created_at !== undefined,
    );

    if (session.device_type) {
      TestValidator.predicate(
        "device type is valid string",
        typeof session.device_type === "string",
      );
    }
    if (session.device_name) {
      TestValidator.predicate(
        "device name is valid string",
        typeof session.device_name === "string",
      );
    }
  }

  // Step 11: Verify authentication footprint monitoring
  TestValidator.predicate(
    "user can monitor multiple sessions",
    allSessions.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination info is comprehensive",
    allSessions.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination has valid current page",
    allSessions.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    allSessions.pagination.records >= 0,
  );
}
