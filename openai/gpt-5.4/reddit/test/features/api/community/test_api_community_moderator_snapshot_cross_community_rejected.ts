import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSnapshot";
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

export async function test_api_community_moderator_snapshot_cross_community_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerAConnection: api.IConnection = { host: connection.host };
  const ownerAJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const ownerA: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerAConnection, {
      body: ownerAJoin,
    });
  typia.assert(ownerA);
  const communityABody = {
    slug: `community-a-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityA: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerAConnection,
      {
        body: communityABody,
      },
    );
  typia.assert(communityA);
  const moderatorActorConnection: api.IConnection = { host: connection.host };
  const moderatorActorJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const moderatorActor: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorActorConnection, {
      body: moderatorActorJoin,
    });
  typia.assert(moderatorActor);
  const moderatorABody = {
    member_code: moderatorActor.code,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;
  const moderatorInA: ICommunityPlatformCommunityModerator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerAConnection,
      {
        params: {
          communitySlug: communityA.slug,
        },
        body: moderatorABody,
      },
    );
  typia.assert(moderatorInA);
  const ownerBConnection: api.IConnection = { host: connection.host };
  const ownerBJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const ownerB: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerBConnection, {
      body: ownerBJoin,
    });
  typia.assert(ownerB);
  const communityBBody = {
    slug: `community-b-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityB: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerBConnection,
      {
        body: communityBBody,
      },
    );
  typia.assert(communityB);
  const moderatorTargetConnection: api.IConnection = { host: connection.host };
  const moderatorTargetJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const moderatorTarget: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorTargetConnection, {
      body: moderatorTargetJoin,
    });
  typia.assert(moderatorTarget);
  const moderatorBBody = {
    member_code: moderatorTarget.code,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;
  const moderatorInB: ICommunityPlatformCommunityModerator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerBConnection,
      {
        params: {
          communitySlug: communityB.slug,
        },
        body: moderatorBBody,
      },
    );
  typia.assert(moderatorInB);
  TestValidator.equals(
    "moderator A belongs to community A",
    moderatorInA.community.id,
    communityA.id,
  );
  TestValidator.equals(
    "moderator B belongs to community B",
    moderatorInB.community.id,
    communityB.id,
  );
  TestValidator.notEquals("communities differ", communityA.id, communityB.id);
  TestValidator.notEquals(
    "moderator assignments differ",
    moderatorInA.id,
    moderatorInB.id,
  );
  await TestValidator.error(
    "cross-community moderator snapshot creation is rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.snapshots.create(
        moderatorActorConnection,
        {
          communityId: communityA.id,
          moderatorId: moderatorInB.id,
        },
      );
    },
  );
}
