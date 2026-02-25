import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_account_retrieval_non_existent_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent admin account
  // This should throw an HttpError with status 404 (Not Found)
  await TestValidator.httpError(
    "should return 404 for non-existent admin ID",
    404,
    async () =>
      await api.functional.communityPlatform.admins.at(connection, {
        adminId: nonExistentAdminId,
      }),
  );
}
