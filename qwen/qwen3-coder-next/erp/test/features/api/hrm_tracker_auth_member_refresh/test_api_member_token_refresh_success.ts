import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins (gets initial tokens)
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(joined);
  // 2. Perform token refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  refreshConnection.headers = {
    Authorization: joined.token.access,
  };
  const refreshed = await api.functional.hrmTracker.auth.member.refresh(
    refreshConnection,
    {
      body: {
        refresh: joined.token.refresh,
      } satisfies IHrmTrackerMember.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 3. Validate that token refresh worked and produced new access token
  TestValidator.notEquals(
    "new access token differs",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.predicate(
    "access token expires later",
    new Date(refreshed.token.expired_at) > new Date(joined.token.expired_at),
  );
  TestValidator.equals("email matches", refreshed.email, joined.email);
}
