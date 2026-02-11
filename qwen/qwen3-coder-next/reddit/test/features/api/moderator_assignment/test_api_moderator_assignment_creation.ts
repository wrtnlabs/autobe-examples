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
import { generate_random_reddit_platform_admin_communities_moderators_create_moderator } from "../../../generate/generate_random_reddit_platform_admin_communities_moderators_create_moderator";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_moderation } from "../../../prepare/prepare_random_reddit_platform_moderation";

export async function test_api_moderator_assignment_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IRedditPlatformAdmin.IJoin;
  const adminUser = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(adminUser);
  // 2. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(2),
  } satisfies IRedditPlatformMember.IJoin;
  const memberUser = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(memberUser);
  // 3. Create community as member
  const communityData = {
    name: `community_${typia.random<string & tags.Format<"uuid">>()}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditPlatformCommunity.ICreate;
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      { body: communityData },
    );
  typia.assert(community);
  // 4. Admin assigns member as moderator with MODERATOR role
  const moderatorAssignment: IRedditPlatformModeration.ICreate = {
    community_id: community.id,
    user_id: memberUser.id,
    role: "MODERATOR" as const,
  };
  const moderatorRecord =
    await generate_random_reddit_platform_admin_communities_moderators_create_moderator(
      adminConnection,
      {
        body: moderatorAssignment,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderatorRecord);
  // 5. Verify the moderation record
  TestValidator.equals(
    "community_id matches",
    moderatorRecord.community_id,
    community.id,
  );
  TestValidator.equals(
    "user_id matches",
    moderatorRecord.user_id,
    memberUser.id,
  );
  TestValidator.equals("role is MODERATOR", moderatorRecord.role, "MODERATOR");
  TestValidator.predicate(
    "community object exists",
    !!moderatorRecord.community,
  );
  TestValidator.predicate("user object exists", !!moderatorRecord.user);
  // 6. Test that adding another OWNER fails (owner already exists)
  const ownerAssignment: IRedditPlatformModeration.ICreate = {
    community_id: community.id,
    user_id: memberUser.id,
    role: "OWNER" as const,
  };
  await TestValidator.error("cannot create duplicate OWNER", async () => {
    await generate_random_reddit_platform_admin_communities_moderators_create_moderator(
      adminConnection,
      {
        body: ownerAssignment,
        params: { communityId: community.id },
      },
    );
  });
}
