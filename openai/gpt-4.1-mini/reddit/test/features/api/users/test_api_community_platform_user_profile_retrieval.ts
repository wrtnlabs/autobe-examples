import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_user_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Since user creation, posts, comments APIs are not provided, cannot test positive scenarios reliably.
  // Instead, test the 404 not found error scenario for a non-existent user ID.
  // Generate a random non-existent userId
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 on non-existent user ID",
    404,
    async () => {
      await api.functional.communityPlatform.users.at(connection, {
        userId: nonExistentUserId,
      });
    },
  );
}
