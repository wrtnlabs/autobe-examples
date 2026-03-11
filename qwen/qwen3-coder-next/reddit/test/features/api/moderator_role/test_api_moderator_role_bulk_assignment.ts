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

export async function test_api_moderator_role_bulk_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user to own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community as the member
  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(6)}` satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">,
        icon_url: (typia.random<string & tags.Format<"uri">>() ?? null) satisfies string as string,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create another member to assign as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderator);
  // 4. Login as admin to perform bulk role management
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: member.email,
      password: "dummy_password",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  typia.assert(admin);
  // 5. Perform bulk moderator role assignment by admin
  const result =
    await api.functional.redditLike.admin.communities.moderator_roles.updateModeratorRoles(
      adminConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderator.id,
          role: "moderator" as const,
          page: 1,
          limit: 100,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(result);
  // 6. Validate result structure
  TestValidator.equals("has pagination", typeof result.pagination, "object");
  TestValidator.equals("has data array", Array.isArray(result.data), true);
  TestValidator.predicate("has at least one role", result.data.length >= 1);
  // 7. Validate the assigned role
  const assignedRole = result.data.find((r) => r.id === moderator.id);
  TestValidator.equals("moderator role assigned", !!assignedRole, true);
  if (assignedRole) {
    TestValidator.equals(
      "role type is moderator",
      assignedRole.role,
      "moderator",
    );
    TestValidator.predicate(
      "has valid timestamp",
      assignedRole.created_at !== null,
    );
  }
}