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

export async function test_api_community_ban_update_without_community_authority(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Corrected E2E scope with available APIs only:
   * - create a prerequisite ban through the provided generation utility
   * - authenticate a different admin actor
   * - verify that an update attempt from the unrelated actor is rejected
   *
   * Limitation: the provided API surface does not include a ban read endpoint,
   * community creation, or moderation-assignment setup, so full persisted-state
   * verification after rejection cannot be performed here.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_admin_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(ownerAuth);
  const unrelatedConnection: api.IConnection = { host: connection.host };
  const unrelatedAuth = await authorize_admin_join(unrelatedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(unrelatedAuth);
  const createdBan =
    await generate_random_community_platform_admin_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          started_at: new Date().toISOString(),
          expired_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
          community_platform_member_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(createdBan);
  const attemptedUpdate = {
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    status: RandomGenerator.paragraph({ sentences: 2 }),
    expired_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    lifted_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  } satisfies ICommunityPlatformCommunityBan.IUpdate;
  await TestValidator.httpError(
    "ban update is rejected for admin without community authority",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.update(
        unrelatedConnection,
        {
          communitySlug: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<255> &
              tags.Format<"uri"> &
              tags.ContentMediaType<"text/plain">
          >(),
          banId: createdBan.id,
          body: attemptedUpdate,
        },
      );
    },
  );
  TestValidator.notEquals(
    "update request reason differs from original snapshot",
    attemptedUpdate.reason,
    createdBan.reason,
  );
  TestValidator.notEquals(
    "update request status differs from original snapshot",
    attemptedUpdate.status,
    createdBan.status,
  );
  TestValidator.notEquals(
    "update request expiration differs from original snapshot",
    attemptedUpdate.expired_at ?? null,
    createdBan.expired_at,
  );
  TestValidator.notEquals(
    "update request lifted timestamp differs from original snapshot",
    attemptedUpdate.lifted_at ?? null,
    createdBan.lifted_at,
  );
}
