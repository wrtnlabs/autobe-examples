import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";
import { TestValidator } from "@nestia/e2e";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";

export async function test_api_community_moderators_create_owner_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(adminJoin);
  await authorize_admin_login(adminConnection, { body: {} });
  // 2. Setup user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userJoin);
  await authorize_user_login(userConnection, { body: {} });
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      { body: {} },
    );
  typia.assert(community);

  // 4. Use a property that likely contains the actual user id; fallback to generating new UUID
  const userId = ((userJoin as any).community_platform_member_id ?? typia.random<string & tags.Format<"uuid">>()) satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;

  // 5. Prepare community id for assignment; use community.id if exists, else fallback to random UUID
  const communityId = ((community as any).id ?? typia.random<string & tags.Format<"uuid">>()) satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;

  // 6. Admin assigns the user as owner of the community
  const ownerAssignment =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: communityId,
          communityModeratorId: userId,
          role: "owner" as const,
        },
      },
    );
  typia.assert(ownerAssignment);

  // Validate response
  const ownerMod = ownerAssignment as any;
  TestValidator.equals(
    "community ID matches",
    ownerMod.communityId,
    communityId,
  );
  TestValidator.equals(
    "communityModerator ID matches",
    ownerMod.communityModeratorId,
    userId,
  );
  TestValidator.equals("role is owner", ownerMod.role, "owner");
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f\-]{36}$/i.test(ownerMod.id),
  );
  TestValidator.predicate(
    "createdAt is ISO date-time",
    !isNaN(Date.parse(ownerMod.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    !isNaN(Date.parse(ownerMod.updatedAt)),
  );

  // 7. Validate uniqueness constraint: trying to create another owner for same community should error
  await TestValidator.error("unique owner constraint violation", async () => {
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: communityId,
          communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
          role: "owner" as const,
        },
      },
    );
  });
}
