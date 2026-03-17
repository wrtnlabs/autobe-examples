import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorOwner";
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

export async function test_api_community_owner_record_update_cross_community_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorMemberAuth = await authorize_member_join(
    moderatorMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(moderatorMemberAuth);
  const communityA =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(communityB);
  const moderatorA =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: communityA.slug,
        },
        body: {
          member_code: moderatorMemberAuth.code,
        },
      },
    );
  typia.assert(moderatorA);
  const ownerRoleA =
    await api.functional.communityPlatform.member.communities.moderators.owners.create(
      ownerConnection,
      {
        communityId: communityA.id,
        moderatorId: moderatorA.id,
      },
    );
  typia.assert(ownerRoleA);
  TestValidator.notEquals(
    "communities are distinct",
    communityA.id,
    communityB.id,
  );
  TestValidator.equals(
    "moderator belongs to community A",
    moderatorA.community.id,
    communityA.id,
  );
  TestValidator.equals(
    "owner role remains linked to moderator A",
    ownerRoleA.id,
    moderatorA.id,
  );
  TestValidator.equals(
    "owner role remains linked to community A",
    ownerRoleA.community.id,
    communityA.id,
  );
  await TestValidator.error(
    "cross-community owner update rejects mismatched community and moderator chain",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.owners.update(
        ownerConnection,
        {
          communityId: communityB.id,
          moderatorId: moderatorA.id,
          ownerId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies ICommunityPlatformCommunityModeratorOwner.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "community A id unchanged after rejected update",
    moderatorA.community.id,
    communityA.id,
  );
  TestValidator.notEquals(
    "community B remains distinct from community A after rejected update",
    communityB.id,
    communityA.id,
  );
  TestValidator.equals(
    "owner-linked moderator id unchanged after rejected update",
    ownerRoleA.id,
    moderatorA.id,
  );
  TestValidator.equals(
    "owner-linked moderator community unchanged after rejected update",
    ownerRoleA.community.id,
    communityA.id,
  );
}
