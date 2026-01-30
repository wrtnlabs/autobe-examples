import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_post_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicForumAdmin.IJoin,
  });
  typia.assert(adminAuthResult);
  // Generate a valid UUID for a non-existent post (since no create function exists)
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // Test deletion of a non-existent post
  await TestValidator.httpError(
    "deleting non-existent post should return 404",
    404,
    async () => {
      await api.functional.economicForum.admin.posts.erase(adminConnection, {
        postId: nonExistentPostId,
      });
    },
  );
}
