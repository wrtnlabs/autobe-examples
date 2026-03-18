import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_independent_of_password_check(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const initialPassword = RandomGenerator.alphaNumeric(12);
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: initialPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const registeredMemberId = joined.id;
  const registeredMemberEmail = joined.email;
  const originalRefreshToken = joined.token.refresh;
  const passwordAfterJoin = RandomGenerator.alphaNumeric(16);
  TestValidator.notEquals(
    "local password state should differ from the original password variable",
    passwordAfterJoin,
    initialPassword,
  );
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IHrmTimeTrackingMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "member id should remain the same",
    refreshed.id,
    registeredMemberId,
  );
  TestValidator.equals(
    "member email should remain the same",
    refreshed.email,
    registeredMemberEmail,
  );
  TestValidator.equals("member should stay active", refreshed.isActive, true);
  TestValidator.predicate(
    "refreshed access token should be present",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be present",
    refreshed.token.refresh.length > 0,
  );
}
