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

export async function test_api_community_moderator_removal_rejected_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(owner);
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(moderatorMember);
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorMember.code,
        },
      },
    );
  typia.assert(moderatorAssignment);
  const ordinaryMemberConnection: api.IConnection = { host: connection.host };
  const ordinaryMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ordinaryMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(ordinaryMember);
  TestValidator.notEquals(
    "ordinary member is not the owner",
    ordinaryMember.id,
    owner.id,
  );
  TestValidator.notEquals(
    "ordinary member is not the moderator target",
    ordinaryMember.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "moderator assignment belongs to moderator member",
    moderatorAssignment.member.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "moderator assignment belongs to created community",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment was granted by owner",
    moderatorAssignment.grantedByMember.id,
    owner.id,
  );
  await TestValidator.error(
    "non-owner cannot remove community moderator",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.erase(
        ordinaryMemberConnection,
        {
          communityId: community.id,
          moderatorId: moderatorMember.id,
        },
      );
    },
  );
  await api.functional.communityPlatform.member.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderatorMember.id,
    },
  );
}
