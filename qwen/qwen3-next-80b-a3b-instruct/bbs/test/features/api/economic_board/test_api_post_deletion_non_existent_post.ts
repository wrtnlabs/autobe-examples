import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_deletion_non_existent_post(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword1234";
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a valid topic for administrative context
  const topicName: IEconomicBoardTopic.ICreate["name"] = RandomGenerator.pick([
    "Inflation",
    "Tax Policy",
    "Elections",
    "Global Trade",
    "Monetary Policy",
    "Labor Markets",
    "Fiscal Policy",
  ]);
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Attempt to delete a non-existent post (must return 404)
  // Use a UUID that is highly unlikely to exist: all zeros
  const nonExistentPostId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "deleting non-existent post should return 404",
    async () => {
      await api.functional.economicBoard.admin.posts.erase(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
