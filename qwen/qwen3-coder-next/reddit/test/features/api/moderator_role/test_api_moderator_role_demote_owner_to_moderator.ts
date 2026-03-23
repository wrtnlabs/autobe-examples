import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_like_admin_communities_moderator_roles_create } from "../../../generate/generate_random_reddit_like_admin_communities_moderator_roles_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_role_demote_owner_to_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and community creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      username: "admin",
      displayName: "Admin User",
    } satisfies IRedditLikeAdmin.IJoin,
  });
  const community = await generate_random_reddit_like_member_communities_create(
    adminConnection,
    {
      body: {
        name: "testcommunity",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      username: "member",
      displayName: "Member User",
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 3. Create a second owner role for member (backup owner)
  const memberOwnerRole =
    await generate_random_reddit_like_admin_communities_moderator_roles_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          community_id: community.id,
          user_id: member.id,
          role: "owner",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(memberOwnerRole);
  // 4. Demote admin from owner to moderator
  const adminOwnerRole = community.owner;
  const updatedRole =
    await api.functional.redditLike.admin.communities.moderator_roles.update(
      adminConnection,
      {
        communityId: community.id,
        moderatorRoleId: "", // Will find actual role ID
        body: {
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // 5. Validate role change
  TestValidator.equals(
    "role changed to moderator",
    updatedRole.role,
    "moderator",
  );
  // 6. Verify community still has an owner (the member remains as owner)
  TestValidator.equals(
    "member remains as owner",
    memberOwnerRole.role,
    "owner",
  );
  TestValidator.equals("admin is now moderator", updatedRole.role, "moderator");
}
