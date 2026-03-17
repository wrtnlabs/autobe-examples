import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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

export async function test_api_community_ban_detail_authorized_scope_match(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const banId = typia.random<string & tags.Format<"uuid">>();
  const output: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.admin.communities.bans.at(
      adminConnection,
      {
        communityId,
        banId,
      },
    );
  typia.assert(output);
  TestValidator.equals("requested ban id matches response", output.id, banId);
  TestValidator.equals(
    "requested community id matches response community id",
    output.community.id,
    communityId,
  );
  TestValidator.predicate(
    "ban is community-scoped through joined community summary",
    output.community.slug.length > 0 && output.community.title.length > 0,
  );
  TestValidator.predicate(
    "ban includes affected member summary",
    output.member.code.length > 0 && output.member.email.length > 0,
  );
  TestValidator.predicate(
    "ban includes moderation reason and lifecycle state",
    output.reason.length > 0 && output.status.length > 0,
  );
}
