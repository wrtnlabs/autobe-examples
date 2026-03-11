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

/**
 * Test moderator role promotion to owner
 * 1. Admin creates a community
 * 2. New member joins the platform
 * 3. Admin assigns the member as moderator
 * 4. Admin promotes the moderator to owner
 * 5. Verify the role change and ownership
 */
export async function test_api_moderator_role_promote_to_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  // 2. Admin creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(1),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create member to be promoted to owner
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberResult);
  await authorize_member_login(memberConnection, {
    body: {
      email: memberResult.email,
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 4. Admin assigns member as moderator
  const moderatorRole =
    await generate_random_reddit_like_admin_communities_moderator_roles_create(
      adminConnection,
      {
        body: {
          community_id: community.id,
          user_id: memberResult.id,
          role: "moderator" as const,
        } satisfies IRedditLikeModeratorRole.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorRole);
  TestValidator.equals(
    "initial role is moderator",
    moderatorRole.role,
    "moderator",
  );
  // 5. Promote member to owner
  const updatedRole =
    await api.functional.redditLike.admin.communities.moderator_roles.update(
      adminConnection,
      {
        communityId: community.id,
        moderatorRoleId: moderatorRole.id,
        body: {
          role: "owner" as const,
        } satisfies IRedditLikeModeratorRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // 6. Validate promotion
  TestValidator.equals("role is now owner", updatedRole.role, "owner");
  TestValidator.equals("user matches", updatedRole.user.id, memberResult.id);
  TestValidator.equals(
    "community matches",
    updatedRole.community.name,
    community.name,
  );
}
