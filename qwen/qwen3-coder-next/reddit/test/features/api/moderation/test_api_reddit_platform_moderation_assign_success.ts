import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
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
import { generate_random_reddit_platform_admin_reddit_platform_moderations_assign_moderator } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_moderations_assign_moderator";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_moderation } from "../../../prepare/prepare_random_reddit_platform_moderation";

export async function test_api_reddit_platform_moderation_assign_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user with owner permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        display_name: null,
        bio: null,
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  // 2. Create member user to be assigned as moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberUser);
  // 3. Create community to assign moderator to
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Admin assigns member as moderator of the community
  const moderation =
    await api.functional.redditPlatform.admin.redditPlatform.moderations.assignModerator(
      adminConnection,
      {
        body: {
          community_id: community.id,
          user_id: memberUser.id,
          role: "MODERATOR" as const,
        } satisfies IRedditPlatformModeration.ICreate,
      },
    );
  typia.assert(moderation);
  // 5. Validate moderation assignment
  TestValidator.equals(
    "community matches",
    moderation.community_id,
    community.id,
  );
  TestValidator.equals("user matches", moderation.user_id, memberUser.id);
  TestValidator.equals("role is MODERATOR", moderation.role, "MODERATOR");
  TestValidator.predicate("has id", moderation.id !== undefined);
  TestValidator.predicate(
    "has created_at",
    moderation.created_at !== undefined,
  );
  // 6. Validate relations are present
  TestValidator.equals(
    "community name matches",
    moderation.community.name,
    community.name,
  );
  TestValidator.equals(
    "user username matches",
    moderation.user.username,
    memberUser.username,
  );
}
