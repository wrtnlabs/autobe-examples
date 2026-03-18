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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_assignment_update_disable_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin setup (create admin credentials)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: `https://example.com/admin/join/${RandomGenerator.alphabets(10)}`,
      referrer: `https://example.com/admin/ref/${RandomGenerator.alphabets(8)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2) Community creation
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphabets(10)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Create initial moderator assignment record
  const moderatorMemberId = typia.random<string & tags.Format<"uuid">>();
  const assignment =
    await generate_random_community_platform_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: moderatorMemberId,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "initial deleted_at is null",
    assignment.deleted_at,
    null,
  );
  const before = assignment;
  // 4) Soft-disable (deleted_at non-null)
  const disableAt: string & tags.Format<"date-time"> = new Date().toISOString();
  const disabled =
    await api.functional.communityPlatform.communityModerators.updateCommunityModerator(
      adminConnection,
      {
        communityModeratorId: before.id,
        body: {
          deleted_at: disableAt,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(disabled);
  TestValidator.equals("id stable after disable", disabled.id, before.id);
  TestValidator.equals(
    "community_id stable after disable",
    disabled.community_id,
    before.community_id,
  );
  TestValidator.equals(
    "created_at unchanged after disable",
    disabled.created_at,
    before.created_at,
  );
  TestValidator.equals(
    "deleted_at becomes non-null after disable",
    disabled.deleted_at !== null,
    true,
  );
  TestValidator.predicate(
    "updated_at advanced after disable",
    disabled.updated_at > before.updated_at,
  );
  // 5) Re-enable (deleted_at null)
  const reenabled =
    await api.functional.communityPlatform.communityModerators.updateCommunityModerator(
      adminConnection,
      {
        communityModeratorId: before.id,
        body: {
          deleted_at: null,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(reenabled);
  TestValidator.equals("id stable after re-enable", reenabled.id, before.id);
  TestValidator.equals(
    "community_id stable after re-enable",
    reenabled.community_id,
    before.community_id,
  );
  TestValidator.equals(
    "created_at unchanged after re-enable",
    reenabled.created_at,
    before.created_at,
  );
  TestValidator.equals(
    "deleted_at returns to null after re-enable",
    reenabled.deleted_at,
    null,
  );
  TestValidator.predicate(
    "updated_at advanced after re-enable",
    reenabled.updated_at > disabled.updated_at,
  );
}
