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

export async function test_api_moderator_role_removal_without_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two separate communities and users to test ownership boundaries
  // Create first community owned by an admin
  const adminConnection1: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  const iconUrl1 = RandomGenerator.pick(["https://example.com/icon1.png", "https://example.com/icon2.png", "https://example.com/icon3.png"]) satisfies string & tags.Format<"uri"> as string & tags.Format<"uri"> & tags.MaxLength<80000>;
  const community1 = await api.functional.redditLike.member.communities.create(
    adminConnection1,
    {
      body: {
        name: RandomGenerator.alphabets(6),
        icon_url: iconUrl1,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community1);
  // Create second community and admin who will try to remove moderator
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  const iconUrl2 = RandomGenerator.pick(["https://example.com/icon2.png", "https://example.com/icon3.png", "https://example.com/icon4.png"]) satisfies string & tags.Format<"uri"> as string & tags.Format<"uri"> & tags.MaxLength<80000>;
  const community2 = await api.functional.redditLike.member.communities.create(
    adminConnection2,
    {
      body: {
        name: RandomGenerator.alphabets(6),
        icon_url: iconUrl2,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community2);
  // 2. Second community owner assigns a member as moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  const moderatorRole =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection2,
      {
        communityId: community2.id,
        body: {
          community_id: community2.id,
          user_id: member.id,
          role: "moderator" satisfies IRedditLikeModeratorRole.ICreate["role"],
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // 3. First admin (not owner of community2) attempts to remove moderator role - should fail
  await TestValidator.error(
    "admin without ownership should not remove moderator role",
    async () => {
      await api.functional.redditLike.admin.communities.moderator_roles.erase(
        adminConnection1,
        {
          communityId: community2.id,
          moderatorRoleId: moderatorRole.id,
        },
      );
    },
  );
}