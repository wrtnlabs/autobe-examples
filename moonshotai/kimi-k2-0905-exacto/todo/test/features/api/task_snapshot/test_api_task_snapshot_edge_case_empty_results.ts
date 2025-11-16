import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTaskSnapshot";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSnapshot";
import type { ITodoAppTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test handling of edge cases where no snapshots match the search criteria.
 * Verify that the system gracefully handles scenarios where filter combinations
 * produce no results, returning appropriate empty responses with proper
 * pagination metadata. The test uses highly specific search criteria that won't
 * match any existing snapshots.
 *
 * 1. Create user account and authenticate
 * 2. Create baseline task to ensure system has data
 * 3. Create task snapshot by updating the task
 * 4. Perform highly specific search with criteria that won't match any snapshots
 * 5. Verify empty results with proper pagination metadata
 */
export async function test_api_task_snapshot_edge_case_empty_results(
  connection: api.IConnection,
) {
  // Generate random user credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  // 1. Authenticate user to test edge case handling
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: `https://example.com/tasks`,
      referrer: `https://example.com/register`,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  TestValidator.predicate(
    "user is authenticated successfully",
    user.token.access.length > 0,
  );

  // 2. Create baseline task to ensure system has minimal data
  const taskContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Complete project milestone 1",
      description: {
        type: "full",
        content: taskContent,
      },
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // 3. Create snapshot by updating the task
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: task.id,
      body: {
        title: task.title + " - Updated version with improvements",
        status: "complete",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // 4. Perform extremely specific search that should return no results
  // Use highly specific criteria that realistically won't match any task snapshots
  const searchRequest: ITodoAppTaskSnapshot.IRequest = {
    page: 1,
    limit: 50,
    order: "asc",
    search:
      "XylophonicQuantumChronometerParadigmUnboundedMetaphysicalTranscendence",
    sort_by: "title",
    status: "complete",
    from_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    to_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
    todo_app_task_id: "00000000-0000-0000-0000-000000000000", // Zero UUID that won't exist
    todo_app_user_id: "00000000-0000-0000-0000-000000000001", // Different zero UUID that won't exist
  };

  const searchResults = await api.functional.todoApp.user.taskSnapshots.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchResults);

  // Verify the search term doesn't appear in our actual task data
  const searchTerm = searchRequest.search.toLowerCase();
  TestValidator.predicate(
    "search term not in task title",
    !updatedTask.title.toLowerCase().includes(searchTerm),
  );
  TestValidator.predicate(
    "search term not in task content",
    !taskContent.toLowerCase().includes(searchTerm),
  );

  // 5. Verify empty results with proper pagination metadata
  TestValidator.predicate(
    "search returned empty data array",
    searchResults.data.length === 0,
  );
  TestValidator.predicate(
    "pagination shows zero records in database",
    searchResults.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination shows current page as requested",
    searchResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination shows total pages as 0",
    searchResults.pagination.pages === 0,
  );
  TestValidator.predicate(
    "pagination shows limit as requested",
    searchResults.pagination.limit === 50,
  );

  // Verify pagination metadata is properly structured even when empty
  TestValidator.predicate(
    "pagination metadata contains all required fields",
    Number.isInteger(searchResults.pagination.records) &&
      Number.isInteger(searchResults.pagination.current) &&
      Number.isInteger(searchResults.pagination.pages) &&
      Number.isInteger(searchResults.pagination.limit) &&
      searchResults.pagination.current >= 0 &&
      searchResults.pagination.limit >= 1 &&
      searchResults.pagination.limit <= 100, // Based on schema constraints
  );

  // 6. Test pagination edge case with different page numbers
  const page2Request: ITodoAppTaskSnapshot.IRequest = {
    ...searchRequest,
    page: 2,
    limit: 10,
  };

  const page2Results = await api.functional.todoApp.user.taskSnapshots.index(
    connection,
    {
      body: page2Request,
    },
  );
  typia.assert(page2Results);

  TestValidator.predicate(
    "page 2 also returns empty results",
    page2Results.data.length === 0,
  );
  TestValidator.predicate(
    "page 2 pagination shows current page as 2",
    page2Results.pagination.current === 2,
  );
  TestValidator.predicate(
    "page 2 pagination shows no records",
    page2Results.pagination.records === 0,
  );
}
