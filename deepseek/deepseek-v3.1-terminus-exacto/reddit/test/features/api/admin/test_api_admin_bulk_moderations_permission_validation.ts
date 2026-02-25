import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_bulk_moderations_create } from "../../../generate/generate_random_community_platform_admin_bulk_moderations_create";
import { prepare_random_community_platform_moderation_queue } from "../../../prepare/prepare_random_community_platform_moderation_queue";

export async function test_api_admin_bulk_moderations_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create multiple moderation queue items
  const moderationActions = ArrayUtil.repeat(
    3,
    () =>
      ({
        status: "pending" as const,
        priority: "normal" as const,
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        community_platform_comment_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        resolution: null,
        resolution_reason: null,
      }) satisfies ICommunityPlatformModerationQueue.ICreate,
  );
  // Attempt bulk moderation
  const result =
    await api.functional.communityPlatform.admin.bulk.moderations.create(
      adminConnection,
      { body: moderationActions[0] },
    );
  typia.assert(result);
  // Validate response structure
  TestValidator.predicate("has id", result.id !== undefined);
  TestValidator.equals("status is pending", result.status, "pending");
  TestValidator.equals("priority is normal", result.priority, "normal");
}
