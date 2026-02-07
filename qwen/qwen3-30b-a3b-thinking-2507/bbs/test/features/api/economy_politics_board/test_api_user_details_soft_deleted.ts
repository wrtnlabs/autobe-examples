import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_details_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  const testConnection: api.IConnection = { host: connection.host };
  // Use a known soft-deleted user ID from test data
  const softDeletedUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("soft-deleted user should return 404", async () => {
    await api.functional.economyPoliticsBoard.users.at(testConnection, {
      userId: softDeletedUserId,
    });
  });
}
