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
export async function test_api_todoapp_refresh_token_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a random UUID that does not exist
  const invalidRefreshTokenId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Expect an HttpError indicating 404 Not Found when attempting to retrieve
  // the refresh token with the invalid ID
  await TestValidator.error(
    "refresh token retrieval with non-existent ID should throw 404",
    async () => {
      await api.functional.todoApp.refresh_tokens.at(connection, {
        refreshTokenId: invalidRefreshTokenId,
      });
    },
  );
}
