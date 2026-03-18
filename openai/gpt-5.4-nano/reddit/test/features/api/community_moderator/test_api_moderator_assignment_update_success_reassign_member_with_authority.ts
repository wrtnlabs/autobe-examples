import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_assignment_update_success_reassign_member_with_authority(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.ILogin>(),
  });
  // 2) Members
  const sourceMemberConnection: api.IConnection = { host: connection.host };
  const sourceMember = await authorize_member_join(sourceMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 3) Create community
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4) Create initial moderator assignment for source member
  const initialModerator =
    await generate_random_community_platform_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: sourceMember.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(initialModerator);
  const initialUpdatedAt = initialModerator.updated_at;
  // 5) Execute reassignment
  const updated =
    await api.functional.communityPlatform.communityModerators.updateCommunityModerator(
      adminConnection,
      {
        communityModeratorId: initialModerator.id,
        body: {
          moderator_user_id: targetMember.id,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(updated);
  // 6) Validate fields stability and change
  TestValidator.equals(
    "community moderator id remains stable",
    updated.id,
    initialModerator.id,
  );
  TestValidator.equals(
    "created_at remains stable",
    updated.created_at,
    initialModerator.created_at,
  );
  TestValidator.equals(
    "community_id remains the same",
    updated.community_id,
    initialModerator.community_id,
  );
  TestValidator.equals(
    "deleted_at stays null (active assignment)",
    updated.deleted_at,
    null,
  );
  TestValidator.equals(
    "moderator_user_id updated",
    updated.moderator_user_id,
    targetMember.id,
  );
  TestValidator.notEquals(
    "updated_at advances",
    updated.updated_at,
    initialUpdatedAt,
  );
  TestValidator.notEquals(
    "no longer points to source moderator",
    updated.moderator_user_id,
    sourceMember.id,
  );
}
