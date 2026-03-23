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

export async function test_api_moderator_role_promotion_to_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a community
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  const community = await api.functional.redditLike.member.communities.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        icon_url: RandomGenerator.pick(["https://example.com/icon.png", undefined]),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Register a member to promote to owner
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.pick(["https://example.com/avatar.png", undefined]),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Promote member to community owner
  await api.functional.redditLike.admin.communities.moderator_roles.create(
    adminConnection,
    {
      communityId: community.id,
      body: {
        user_id: memberAuth.id,
        community_id: community.id,
        role: "owner",
      } satisfies IRedditLikeModeratorRole.ICreate,
    },
  );
  // 4. Verify the created role
  const roles =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberAuth.id,
          community_id: community.id,
          role: "owner",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(roles);
  TestValidator.equals("role is owner", roles.role, "owner");
  TestValidator.equals("community matches", community.id, community.id);
  TestValidator.equals("user matches", roles.user.id, memberAuth.id);
}