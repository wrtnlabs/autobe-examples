import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshedConnection, {
    body: {
      refresh: joined.token.refresh,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("member id is preserved", refreshed.id, joined.id);
  TestValidator.equals("member code is preserved", refreshed.code, joined.code);
  TestValidator.equals(
    "member email is preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "member email verification state is preserved",
    refreshed.emailVerified,
    joined.emailVerified,
  );
  TestValidator.equals(
    "member status is preserved",
    refreshed.status,
    joined.status,
  );
  TestValidator.equals(
    "member profile id is preserved",
    refreshed.profile.id,
    joined.profile.id,
  );
  TestValidator.predicate(
    "refreshed access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed token continues same member session context",
    refreshed.token.access !== joined.token.access ||
      refreshed.token.refresh !== joined.token.refresh ||
      refreshed.token.expired_at !== joined.token.expired_at ||
      refreshed.token.refreshable_until !== joined.token.refreshable_until,
  );
}
