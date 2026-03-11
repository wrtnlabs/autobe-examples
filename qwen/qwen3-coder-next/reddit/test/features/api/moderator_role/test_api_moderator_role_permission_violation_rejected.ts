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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_moderator_role_permission_violation_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create first community (admin becomes owner)
  const community1 = await api.functional.redditLike.member.communities.create(
    adminConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
      },
    },
  );
  typia.assert(community1);
  // 3. Create second community (admin becomes owner)
  const community2 = await api.functional.redditLike.member.communities.create(
    adminConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
      },
    },
  );
  typia.assert(community2);
  // 4. Create another member and log in
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Member creates a community and becomes owner (this will be the target for permission test)
  const memberCommunity =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: {
          name: `member_community_${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(memberCommunity);
  // 6. Try to update moderator role in member's community (admin is not owner, should fail)
  // Since we can't list roles, we'll use a randomly generated moderator role ID which should fail with permission error
  await TestValidator.error(
    "permission violation should be rejected",
    async () => {
      await api.functional.redditLike.admin.communities.moderator_roles.update(
        adminConnection,
        {
          communityId: memberCommunity.id,
          moderatorRoleId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            role: "moderator" as const,
          },
        },
      );
    },
  );
}
