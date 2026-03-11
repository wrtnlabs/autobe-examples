import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_moderator_role_remove_owner_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin to create community
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      username: "admin",
      displayName: "Admin User",
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Create community as admin
  const community = await api.functional.redditLike.member.communities.create(
    adminConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Get initial moderator roles to find owner
  const initialRoles =
    await api.functional.redditLike.admin.communities.moderator_roles.updateModeratorRoles(
      adminConnection,
      {
        communityId: community.id,
        body: { user_id: "", role: "owner" },
      },
    );
  typia.assert(initialRoles);
  // Find the owner role
  const ownerRole = initialRoles.data.find((r) => r.role === "owner");
  if (!ownerRole) {
    throw new Error("No owner role found in community");
  }
  // 4. Attempt to remove the owner (should fail)
  await TestValidator.error(
    "cannot remove last owner from community",
    async () => {
      await api.functional.redditLike.admin.communities.moderator_roles.updateModeratorRoles(
        adminConnection,
        {
          communityId: community.id,
          body: {
            user_id: ownerRole.id,
            role: "owner",
          } satisfies IRedditLikeModeratorRole.IRequest,
        },
      );
    },
  );
  // 5. Verify owner role still exists
  const finalRoles =
    await api.functional.redditLike.admin.communities.moderator_roles.updateModeratorRoles(
      adminConnection,
      {
        communityId: community.id,
        body: { user_id: "", role: "owner" },
      },
    );
  typia.assert(finalRoles);
  const remainingOwner = finalRoles.data.find((r) => r.role === "owner");
  TestValidator.equals(
    "owner role still exists",
    remainingOwner?.id,
    ownerRole.id,
  );
}
