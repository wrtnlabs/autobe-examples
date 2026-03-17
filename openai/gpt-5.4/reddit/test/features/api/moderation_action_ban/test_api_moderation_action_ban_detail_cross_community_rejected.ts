import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_ban_detail_cross_community_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const otherCommunityId = typia.random<string & tags.Format<"uuid">>();
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const moderationActionBanId = typia.random<string & tags.Format<"uuid">>();
  const otherModerationActionBanId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "arbitrary nested identifiers are rejected",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.bans.at(
        adminConnection,
        {
          communityId,
          moderationActionId,
          moderationActionBanId,
        },
      );
    },
  );
  await TestValidator.error(
    "cross-community identifier mixing is rejected",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.bans.at(
        adminConnection,
        {
          communityId: otherCommunityId,
          moderationActionId,
          moderationActionBanId,
        },
      );
    },
  );
  await TestValidator.error(
    "ban linkage outside supplied moderation action is rejected",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.bans.at(
        adminConnection,
        {
          communityId,
          moderationActionId,
          moderationActionBanId: otherModerationActionBanId,
        },
      );
    },
  );
}
