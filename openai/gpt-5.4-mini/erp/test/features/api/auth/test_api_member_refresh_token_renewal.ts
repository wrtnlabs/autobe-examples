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

export async function test_api_member_refresh_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const originalMember: IHrmTimeTrackingMember.IAuthorized = joined;
  const originalToken = originalMember.token;
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refreshToken: originalToken.refresh,
    } satisfies IHrmTimeTrackingMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "member id should be preserved",
    refreshed.id,
    originalMember.id,
  );
  TestValidator.equals(
    "member email should be preserved",
    refreshed.email,
    originalMember.email,
  );
  TestValidator.equals(
    "member active state should be preserved",
    refreshed.isActive,
    originalMember.isActive,
  );
  TestValidator.notEquals(
    "access token should be rotated",
    refreshed.token.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshed.token.refresh,
    originalToken.refresh,
  );
  TestValidator.predicate(
    "refreshed access expiration should be valid",
    new Date(refreshed.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshed refresh expiration should be valid",
    new Date(refreshed.token.refreshable_until).getTime() > Date.now(),
  );
}
