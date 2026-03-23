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

export async function test_api_moderator_role_non_member_assignment_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member actor and community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Create community as member
  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Create non-member users (users who are not part of the community)
  const nonMemberConnection1: api.IConnection = { host: connection.host };
  const nonMember1 = await authorize_member_join(nonMemberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(nonMember1);
  const nonMemberConnection2: api.IConnection = { host: connection.host };
  const nonMember2 = await authorize_member_join(nonMemberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(nonMember2);
  // 3. Auth as admin to perform invalid bulk assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  // 4. Attempt to assign moderator roles to non-members (should be rejected)
  await TestValidator.httpError(
    "non-member moderator assignment should be rejected",
    422,
    async () => {
      await api.functional.redditLike.admin.communities.moderator_roles.updateModeratorRoles(
        adminConnection,
        {
          communityId: community.id,
          body: {
            user_id: nonMember1.id,
            role: "moderator",
          } satisfies IRedditLikeModeratorRole.IRequest,
        },
      );
    },
  );
  // 5. Verify non-members are not moderators
  const moderators =
    await api.functional.redditLike.admin.communities.moderator_roles.updateModeratorRoles(
      adminConnection,
      {
        communityId: community.id,
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          role: "moderator",
          page: 1,
          limit: 100,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(moderators);
  TestValidator.equals("only owner is moderator", moderators.data.length, 1);
  TestValidator.equals("owner matches", moderators.data[0].role, "owner");
}
