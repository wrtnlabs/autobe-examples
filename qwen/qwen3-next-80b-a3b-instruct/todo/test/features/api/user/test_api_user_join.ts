import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_join(connection: api.IConnection) {
  // Generate realistic test data for user registration
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);

  // Call the user join API with the generated credentials
  const result: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    },
  );

  // Validate that the response contains the expected structure and types
  typia.assert(result);
}
