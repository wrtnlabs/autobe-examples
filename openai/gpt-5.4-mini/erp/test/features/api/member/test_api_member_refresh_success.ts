import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/auth/member/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies IErpHrmTimeMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("member id preserved", refreshed.id, joined.id);
  TestValidator.equals("member email preserved", refreshed.email, joined.email);
  TestValidator.equals(
    "member display name preserved",
    refreshed.displayName,
    joined.displayName,
  );
  TestValidator.equals(
    "avatar image url preserved",
    refreshed.avatarImageUrl,
    joined.avatarImageUrl,
  );
  TestValidator.equals(
    "phone number preserved",
    refreshed.phoneNumber,
    joined.phoneNumber,
  );
  TestValidator.notEquals(
    "access token should be refreshed",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.predicate(
    "access expiration metadata should advance or remain a valid future timestamp",
    new Date(refreshed.token.expired_at).getTime() >=
      new Date(joined.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refreshable until metadata should remain valid in the future",
    new Date(refreshed.token.refreshable_until).getTime() >=
      new Date(refreshed.token.expired_at).getTime(),
  );
}
