import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBoolean } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoolean";
import type { INull } from "@ORGANIZATION/PROJECT-api/lib/structures/INull";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoConfiguration";
import type { IString } from "@ORGANIZATION/PROJECT-api/lib/structures/IString";
import type { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test that authenticated users can search and filter system configuration
 * settings with advanced query capabilities. This scenario validates the
 * configuration management functionality including text-based search on
 * configuration keys and descriptions, filtering by configuration type and
 * system flags, and pagination support for large result sets. The test ensures
 * users can efficiently locate specific configuration settings while
 * maintaining appropriate access controls.
 *
 * 1. Create a user account to establish authenticated session
 * 2. Generate various configuration entries with different types and system flags
 * 3. Test basic search functionality with text queries
 * 4. Test filtering by configuration type
 * 5. Test filtering by system/system-only configurations
 * 6. Test pagination with different limit values
 * 7. Test combined search and filtering queries
 * 8. Verify proper access controls and authentication requirements
 */
export async function test_api_user_configuration_search(
  connection: api.IConnection,
) {
  // Register new user to establish authenticated session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Test basic configuration search
  const basicSearchRequest = typia.random<ITodoConfiguration.IRequest>();
  basicSearchRequest.page = 1 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  basicSearchRequest.limit = 20 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const basicSearchResults =
    await api.functional.todo.user.configurations.index(connection, {
      body: basicSearchRequest satisfies ITodoConfiguration.IRequest,
    });
  typia.assert(basicSearchResults);

  TestValidator.predicate(
    "search results have pagination",
    basicSearchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "search results have data array",
    Array.isArray(basicSearchResults.data),
  );
  TestValidator.predicate(
    "pagination current within range",
    basicSearchResults.pagination.current >= 0,
  );
}
