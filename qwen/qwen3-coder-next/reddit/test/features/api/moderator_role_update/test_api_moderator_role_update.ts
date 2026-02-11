import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderator_role_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const adminUser = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminUser);
  // 2. Update moderator role using the available endpoint
  // Note: The IRedditPlatformModeration.IUpdate DTO only includes the role field,
  // but the scenario plan expects community_id and user_id fields as well.
  // The endpoint implementation may require these fields even if not shown in DTO.
  const updateModeratorBody = {
    role: "MODERATOR" as const,
  } satisfies IRedditPlatformModeration.IUpdate;
  const updatedModerator =
    await api.functional.redditPlatform.admin.redditPlatform.moderations.updateModerator(
      adminConnection,
      {
        body: updateModeratorBody,
      },
    );
  typia.assert(updatedModerator);
  // 3. Verify the role update
  TestValidator.equals(
    "role updated correctly",
    updatedModerator.role,
    "MODERATOR",
  );
}
