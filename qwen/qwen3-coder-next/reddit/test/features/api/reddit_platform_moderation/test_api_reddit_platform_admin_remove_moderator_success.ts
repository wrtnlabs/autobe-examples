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

export async function test_api_reddit_platform_admin_remove_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Step 2: Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(2),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAccount);
  // Step 3: Create community (using member connection)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Assign moderator (admin adds member as moderator)
  const moderation =
    await api.functional.redditPlatform.admin.redditPlatform.moderations.assignModerator(
      adminConnection,
      {
        body: {
          community_id: community.id,
          user_id: memberAccount.id,
          role: "MODERATOR" as const,
        } satisfies IRedditPlatformModeration.ICreate,
      },
    );
  typia.assert(moderation);
  // Step 5: Remove moderator assignment
  const removedModeration =
    await api.functional.redditPlatform.admin.redditPlatform.moderations.erase(
      adminConnection,
      {
        moderationId: moderation.id,
      },
    );
  typia.assert(removedModeration);
  // Step 6: Validate removal
  TestValidator.equals(
    "moderation ID matches",
    removedModeration.id,
    moderation.id,
  );
  TestValidator.equals(
    "community ID matches",
    removedModeration.community_id,
    community.id,
  );
  TestValidator.equals(
    "user ID matches",
    removedModeration.user_id,
    memberAccount.id,
  );
  TestValidator.equals("role matches", removedModeration.role, "MODERATOR");
  TestValidator.predicate(
    "created_at exists",
    Boolean(removedModeration.created_at),
  );
}
