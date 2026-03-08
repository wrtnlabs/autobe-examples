import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_karma_zero_initial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(joinResponse);
  // 2. Create actor-specific connection for the new member
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  memberConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 3. Retrieve karma score (no voting activity performed)
  const karmaResponse =
    await api.functional.redditPlatform.member.profile.karma.at(
      memberConnection,
    );
  typia.assert(karmaResponse);
  // 4. Validate that initial karma is zero
  TestValidator.equals(
    "new member karma is zero",
    karmaResponse.karma_score,
    0,
  );
}
