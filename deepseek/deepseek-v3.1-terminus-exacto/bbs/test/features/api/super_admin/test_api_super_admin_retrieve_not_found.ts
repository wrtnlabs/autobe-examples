import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_admin_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that doesn't correspond to any existing super admin record
  const nonExistentSuperAdminId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent super administrator
  // This should throw an HttpError with 404 status
  await TestValidator.httpError(
    "retrieve non-existent super admin",
    404,
    async () => {
      await api.functional.discussionBoard.super_admins.at(connection, {
        superAdminId: nonExistentSuperAdminId,
      });
    },
  );
}
