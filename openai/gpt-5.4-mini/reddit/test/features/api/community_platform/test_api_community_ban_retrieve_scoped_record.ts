import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_retrieve_scoped_record(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.assert<string & tags.MinLength<1> & tags.Format<"password">>(
        typia.random<string & tags.Format<"password">>(),
      ),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const banId = typia.random<string & tags.Format<"uuid">>();
  const ban = await api.functional.communityPlatform.admin.communities.bans.at(
    adminConnection,
    {
      communityId,
      banId,
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban id matches request", ban.id, banId);
  TestValidator.equals(
    "community id matches request",
    ban.community.id,
    communityId,
  );
  TestValidator.predicate(
    "ban record is scoped to the requested community",
    ban.community.id === communityId,
  );
  TestValidator.predicate("reason is non-empty", ban.reason.length > 0);
  TestValidator.predicate(
    "startedAt is a valid timestamp string",
    ban.startedAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt is a valid timestamp string",
    ban.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is a valid timestamp string",
    ban.updatedAt.length > 0,
  );
}
