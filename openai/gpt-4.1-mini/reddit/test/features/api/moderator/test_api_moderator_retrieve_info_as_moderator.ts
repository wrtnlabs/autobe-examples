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

export async function test_api_moderator_retrieve_info_as_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for moderator join
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  // 2. Generate a random moderator join body
  const joinBody: ICommunityPlatformModerator.IJoin =
    typia.random<ICommunityPlatformModerator.IJoin>();
  // 3. Join as moderator to authenticate and get token
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorJoinConnection, { body: joinBody });
  typia.assert(authorized);
  // 4. Prepare a new connection with Authorization header from previous authorized connection
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { ...moderatorJoinConnection.headers },
  };
  // 5. Due to lack of explicit moderatorId in DTOs, generate a UUID for moderatorId
  //    This may simulate retrieving info for the currently authorized moderator
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  // 6. Call the moderator information retrieval API with the prepared connection and moderatorId
  const moderatorInfo: ICommunityPlatformModerator =
    await api.functional.communityPlatform.moderators.at(moderatorConnection, {
      moderatorId: moderatorId,
    });
  typia.assert(moderatorInfo);
}
