import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionPost";
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

export async function test_api_moderation_action_post_cross_community_mismatch_hidden(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  typia.assert(
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    }),
  );
  const primaryCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphabets(4)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(primaryCommunity);
  const secondaryCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphabets(4)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondaryCommunity);
  TestValidator.notEquals(
    "communities must be different",
    primaryCommunity.id,
    secondaryCommunity.id,
  );
  const hiddenModerationActionId = typia.random<string & tags.Format<"uuid">>();
  const hiddenModerationActionPostId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "primary community hides unresolved moderation nesting",
    404,
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.posts.getByCommunityidAndModerationactionidAndModerationactionpostid(
        memberConnection,
        {
          communityId: primaryCommunity.id,
          moderationActionId: hiddenModerationActionId,
          moderationActionPostId: hiddenModerationActionPostId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "secondary community also hides the same unresolved moderation nesting",
    404,
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.posts.getByCommunityidAndModerationactionidAndModerationactionpostid(
        memberConnection,
        {
          communityId: secondaryCommunity.id,
          moderationActionId: hiddenModerationActionId,
          moderationActionPostId: hiddenModerationActionPostId,
        },
      );
    },
  );
}
