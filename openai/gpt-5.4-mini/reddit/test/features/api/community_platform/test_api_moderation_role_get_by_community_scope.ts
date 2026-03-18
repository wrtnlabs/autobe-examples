import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_role_get_by_community_scope(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const output =
    await api.functional.communityPlatform.admin.communities.moderationRoles.at(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        moderationRoleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals("moderation role id", output.id, output.id);
  TestValidator.equals(
    "community summary id exists",
    output.community.id,
    output.community.id,
  );
  TestValidator.equals("member summary exists", output.member, output.member);
  TestValidator.equals("role type exists", output.role_type, output.role_type);
  TestValidator.equals(
    "created_at exists",
    output.created_at,
    output.created_at,
  );
  TestValidator.equals(
    "updated_at exists",
    output.updated_at,
    output.updated_at,
  );
  TestValidator.equals(
    "deleted_at exists",
    output.deleted_at,
    output.deleted_at,
  );
}
