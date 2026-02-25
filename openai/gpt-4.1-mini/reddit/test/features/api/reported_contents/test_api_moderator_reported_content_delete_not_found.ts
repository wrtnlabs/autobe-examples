import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_reported_content_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and obtains authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  // Update connection headers with token
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorAuthorized.token.access;
  // 2. Attempt to delete a reported content with a non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that an HTTP 404 error is thrown
  await TestValidator.httpError(
    "delete non-existent reported content should return 404 Not Found",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reportedContents.erase(
        moderatorConnection,
        { id: nonExistentId },
      );
    },
  );
}
