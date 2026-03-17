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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
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

export async function test_api_moderation_action_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator becomes owner member",
    community.member.id,
    owner.id,
  );
  const page = 1;
  const limit = 10;
  const request = {
    page,
    limit,
  } satisfies ICommunityPlatformModerationAction.IRequest;
  const result =
    await api.functional.communityPlatform.member.communities.moderationActions.index(
      ownerConnection,
      {
        communityId: community.id,
        body: request,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "pagination current matches requested page",
    result.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    result.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    result.data.length <= limit,
  );
  TestValidator.equals(
    "pagination pages follows records and limit formula",
    result.pagination.pages,
    Math.ceil(result.pagination.records / result.pagination.limit),
  );
  for (const item of result.data) {
    TestValidator.equals(
      "item belongs to requested community",
      item.community.id,
      community.id,
    );
    TestValidator.equals(
      "moderator assignment scoped to requested community",
      item.communityModerator.community.id,
      community.id,
    );
  }
  for (let i = 1; i < result.data.length; ++i) {
    const previous = result.data[i - 1];
    const current = result.data[i];
    const previousTime = new Date(previous.created_at).getTime();
    const currentTime = new Date(current.created_at).getTime();
    TestValidator.predicate(
      "moderation actions are ordered newest-first by created_at",
      previousTime >= currentTime,
    );
    if (previous.created_at === current.created_at) {
      TestValidator.predicate(
        "moderation actions use deterministic secondary id ordering",
        previous.id >= current.id,
      );
    }
  }
}
