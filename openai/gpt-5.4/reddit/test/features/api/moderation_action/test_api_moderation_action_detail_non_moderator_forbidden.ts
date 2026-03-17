import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderation_action_detail_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const attackerConnection: api.IConnection = { host: connection.host };
  const attacker = await authorize_member_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(attacker);
  const communityIdHeader =
    connection.headers?.["x-community-id"] ??
    connection.headers?.["X-Community-Id"];
  TestValidator.predicate(
    "seeded community id header exists",
    typeof communityIdHeader === "string" && communityIdHeader.length > 0,
  );
  const communityId = typia.assert<string & tags.Format<"uuid">>(
    communityIdHeader,
  );
  const moderationActionIdHeader =
    connection.headers?.["x-moderation-action-id"] ??
    connection.headers?.["X-Moderation-Action-Id"];
  TestValidator.predicate(
    "seeded moderation action id header exists",
    typeof moderationActionIdHeader === "string" &&
      moderationActionIdHeader.length > 0,
  );
  const moderationActionId = typia.assert<string & tags.Format<"uuid">>(
    moderationActionIdHeader,
  );
  await TestValidator.httpError(
    "non-moderator cannot read community moderation action detail",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.at(
        attackerConnection,
        {
          communityId,
          moderationActionId,
        },
      );
    },
  );
}
