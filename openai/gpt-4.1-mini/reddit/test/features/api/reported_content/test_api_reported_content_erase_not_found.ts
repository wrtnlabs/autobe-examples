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

export async function test_api_reported_content_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion attempt on non-existent reported content
  // 1. Moderator authentication by join (to get authorized connection)
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorAuthorized);
  // Create a new authorized connection with token
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${moderatorAuthorized.token.access}` },
  };
  // 2. Attempt to delete a reported content with a random UUID (non-existent)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent reported content should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.reportedContents.erase(
        moderatorConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
