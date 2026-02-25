import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_community_deletion_not_found_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate user via join utility function
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Test: Attempt to delete non-existent community with valid UUID format
  // This tests proper UUID validation and community existence checking
  await TestValidator.httpError(
    "delete non-existent community",
    404,
    async () => {
      await api.functional.communityPlatform.user.communities.erase(
        userConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
