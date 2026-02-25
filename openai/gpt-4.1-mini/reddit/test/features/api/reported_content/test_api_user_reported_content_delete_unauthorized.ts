import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_reported_content_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Regular user joins and obtains authentication
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userJoinConnection, {});
  typia.assert(userJoin);
  // We create a userConnection that includes the user token for authorization
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${userJoin.token.access}` },
  };
  // 2. Generate a random UUID for reported content ID
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt deletion by regular user should fail with HttpError 403
  await TestValidator.httpError(
    "unauthorized delete reported content",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.reportedContents.erase(
        userConnection,
        { id: reportedContentId },
      );
    },
  );
}
