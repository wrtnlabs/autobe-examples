import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
export async function test_api_todoapp_refresh_token_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a valid refreshTokenId (UUID string) to test retrieval
  const refreshTokenId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 2: Call the API function to retrieve the refresh token data
  const refreshToken: ITodoAppRefreshToken =
    await api.functional.todoApp.refresh_tokens.at(connection, {
      refreshTokenId,
    });
  // Step 3: Validate the structure and contents of the response
  typia.assert(refreshToken);
  // Additional optional business validations can be added here if needed
}
