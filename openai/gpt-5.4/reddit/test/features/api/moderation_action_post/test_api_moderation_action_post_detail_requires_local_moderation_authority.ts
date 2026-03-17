import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionPost";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_post_detail_requires_local_moderation_authority(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_join(unauthorizedAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const moderationActionPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "authenticated admin without local moderation authority is rejected",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.posts.getByCommunityidAndModerationactionidAndModerationactionpostid(
        unauthorizedAdminConnection,
        {
          communityId,
          moderationActionId,
          moderationActionPostId,
        },
      );
    },
  );
}
