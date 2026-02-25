import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_post_detail_unauthorized_access_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to fetch a post detail without any authentication tokens
  // Expectation: server must deny access with a 401 or 403 HTTP error
  // Initialize a fresh connection without auth headers
  const guestConnection: api.IConnection = { host: connection.host };
  // Random postId for testing
  const postId = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized post detail access should be denied",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.posts.at(
        guestConnection,
        {
          postId,
        },
      );
    },
  );
}
