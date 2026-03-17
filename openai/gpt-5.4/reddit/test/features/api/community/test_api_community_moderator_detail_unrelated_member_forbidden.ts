import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_detail_unrelated_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  const communityBody = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community slug matches input",
    community.slug,
    communityBody.slug,
  );
  TestValidator.equals(
    "community title matches input",
    community.title,
    communityBody.title,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityBody.description,
  );
  const targetModeratorConnection: api.IConnection = { host: connection.host };
  const targetModeratorAuthorized = await authorize_member_join(
    targetModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(targetModeratorAuthorized);
  const moderatorBody = {
    member_code: targetModeratorAuthorized.code,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;
  const moderator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: moderatorBody,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator community id matches created community",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator member id matches assigned member",
    moderator.member.id,
    targetModeratorAuthorized.id,
  );
  TestValidator.equals(
    "moderator member code input created assignment",
    moderatorBody.member_code,
    targetModeratorAuthorized.code,
  );
  const unrelatedMemberConnection: api.IConnection = { host: connection.host };
  const unrelatedMemberAuthorized = await authorize_member_join(
    unrelatedMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(unrelatedMemberAuthorized);
  TestValidator.notEquals(
    "unrelated member differs from moderator target",
    unrelatedMemberAuthorized.id,
    targetModeratorAuthorized.id,
  );
  TestValidator.notEquals(
    "unrelated member differs from community owner",
    unrelatedMemberAuthorized.id,
    ownerAuthorized.id,
  );
  await TestValidator.httpError(
    "unrelated member cannot inspect moderator assignment detail",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.at(
        unrelatedMemberConnection,
        {
          communityId: community.id,
          moderatorId: moderator.id,
        },
      );
    },
  );
}
