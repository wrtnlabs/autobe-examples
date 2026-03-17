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

export async function test_api_moderation_action_post_detail_same_community_authorized(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const output: ICommunityPlatformModerationActionPost =
    await api.functional.communityPlatform.admin.communities.moderationActions.posts.getByCommunityidAndModerationactionidAndModerationactionpostid(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        moderationActionId: typia.random<string & tags.Format<"uuid">>(),
        moderationActionPostId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "moderation action community matches post community",
    output.moderationAction.community.id,
    output.post.community.id,
  );
  TestValidator.equals(
    "moderation action target type is post",
    output.moderationAction.targetType,
    "post",
  );
  if (output.moderationAction.targetId !== null) {
    TestValidator.equals(
      "moderation action target id matches nested post id",
      output.moderationAction.targetId,
      output.post.id,
    );
  }
  TestValidator.equals(
    "target linkage is active in current-state view",
    output.deleted_at,
    null,
  );
  TestValidator.equals(
    "moderation action is active in current-state view",
    output.moderationAction.deleted_at,
    null,
  );
  TestValidator.equals(
    "post is active in current-state view",
    output.post.deleted_at,
    null,
  );
  TestValidator.equals(
    "community is active in current-state view",
    output.post.community.deleted_at,
    null,
  );
  TestValidator.equals(
    "community moderator assignment is active in current-state view",
    output.moderationAction.communityModerator.deleted_at,
    null,
  );
}
