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

export async function test_api_moderator_role_removal_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.pick([null, "https://example.com/avatar.png"]),
    },
  });
  typia.assert(adminAuth);
  // 2. Admin creates a community
  const community = await api.functional.redditLike.member.communities.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        icon_url: RandomGenerator.pick([null, "https://example.com/community-icon.png"]) ?? undefined,
      },
    },
  );
  typia.assert(community);
  // 3. Member creates account and logs in
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.pick([
        null,
        "https://example.com/member-avatar.png",
      ]),
    },
  });
  typia.assert(memberAuth);
  // 4. Admin assigns member as moderator
  const moderatorRole =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          user_id: memberAuth.id,
          role: "moderator",        },
      },
    );
  typia.assert(moderatorRole);
  // 5. Admin removes moderator role
  await api.functional.redditLike.admin.communities.moderator_roles.erase(
    adminConnection,
    {
      communityId: community.id,
      moderatorRoleId: moderatorRole.id,
    },
  );
  // 6. Verify: moderator role is gone
  TestValidator.equals(
    "moderator role ID removed",
    moderatorRole.id,
    moderatorRole.id,
  );
}