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

export async function test_api_moderator_role_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a community
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  const community = await api.functional.redditLike.member.communities.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Admin adds a member as moderator
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
  // 3. Admin calls the add-moderator endpoint
  const moderatorRole =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          user_id: member.id,
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // 4. Validate response structure
  TestValidator.equals(
    "community_id matches",
    (moderatorRole.community as any).id,
    community.id,
  );
  TestValidator.equals("user_id matches", (moderatorRole.user as any).id, member.id);
  TestValidator.equals("role is moderator", moderatorRole.role, "moderator");
  TestValidator.predicate(
    "has valid created_at",
    Boolean(moderatorRole.created_at),
  );
}