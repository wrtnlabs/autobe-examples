import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_member_profile_update_nonexistent_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      username: "admin_user",
      display_name: "Admin User",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Generate a random non-existent user ID
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to update non-existent user profile and verify 404 error
  await TestValidator.httpError(
    "should return 404 Not Found for non-existent user",
    404,
    async () => {
      await api.functional.redditLike.admin.users.update(adminConnection, {
        userId: nonExistentUserId,
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          avatar_url: null,
        } satisfies IRedditLikeMember.IUpdate,
      });
    },
  );
}
