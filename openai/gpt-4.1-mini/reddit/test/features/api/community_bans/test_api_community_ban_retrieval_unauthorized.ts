import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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

export async function test_api_community_ban_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Setup base connection without moderator authorization
  const generalUserConnection: api.IConnection = { host: connection.host };
  // Use a random UUID as banId to attempt unauthorized access
  const fakeBanId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the community ban details with unauthorized connection
  // Expect an authorization error (likely 401 Unauthorized or 403 Forbidden)
  await TestValidator.httpError(
    "unauthorized community ban retrieval should fail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.community_bans.at(
        generalUserConnection,
        { banId: fakeBanId },
      );
    },
  );
}
