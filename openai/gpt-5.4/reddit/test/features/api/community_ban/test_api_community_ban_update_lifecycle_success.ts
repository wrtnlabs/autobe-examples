import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_ban_update_lifecycle_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const originalBan =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(originalBan);
  const updatedReason = RandomGenerator.paragraph({ sentences: 5 });
  const updatedExpiredAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const updatedLiftedAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 31,
  ).toISOString();
  const updateBody = {
    reason: updatedReason,
    status: "lifted",
    expired_at: updatedExpiredAt,
    lifted_at: updatedLiftedAt,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;
  const updatedBan =
    await api.functional.communityPlatform.admin.communities.bans.update(
      adminConnection,
      {
        communitySlug: originalBan.community.slug,
        banId: originalBan.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);
  TestValidator.equals("ban id unchanged", updatedBan.id, originalBan.id);
  TestValidator.equals(
    "community summary preserved",
    updatedBan.community,
    originalBan.community,
  );
  TestValidator.equals(
    "member summary preserved",
    updatedBan.member,
    originalBan.member,
  );
  TestValidator.equals(
    "started_at preserved",
    updatedBan.started_at,
    originalBan.started_at,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedBan.created_at,
    originalBan.created_at,
  );
  TestValidator.equals(
    "deleted_at preserved",
    updatedBan.deleted_at,
    originalBan.deleted_at,
  );
  TestValidator.equals("reason updated", updatedBan.reason, updateBody.reason);
  TestValidator.equals("status updated", updatedBan.status, updateBody.status);
  TestValidator.equals(
    "expired_at updated",
    updatedBan.expired_at,
    updateBody.expired_at,
  );
  TestValidator.equals(
    "lifted_at updated",
    updatedBan.lifted_at,
    updateBody.lifted_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedBan.updated_at,
    originalBan.updated_at,
  );
}
