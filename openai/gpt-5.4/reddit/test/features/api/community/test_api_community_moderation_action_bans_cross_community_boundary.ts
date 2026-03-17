import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionBan";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionBan";
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

export async function test_api_community_moderation_action_bans_cross_community_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const owningCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(6)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(owningCommunity);
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(6)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(otherCommunity);
  TestValidator.notEquals(
    "setup creates two isolated community scopes",
    owningCommunity.id,
    otherCommunity.id,
  );
  const mismatchedModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestBody = {
    page: 1,
    limit: 10,
    search: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationActionBan.IRequest;
  await TestValidator.httpError(
    "cross-community moderation action ban lookup must be denied without leaking data",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.member.communities.moderationActions.bans.index(
        memberConnection,
        {
          communityId: otherCommunity.id,
          moderationActionId: mismatchedModerationActionId,
          body: requestBody,
        },
      );
    },
  );
}
