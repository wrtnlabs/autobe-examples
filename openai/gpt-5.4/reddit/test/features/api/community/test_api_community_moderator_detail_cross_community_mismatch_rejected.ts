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

export async function test_api_community_moderator_detail_cross_community_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(moderatorMember);
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(owner);
  const firstCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  const secondCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondCommunity);
  TestValidator.notEquals(
    "community ids must differ",
    firstCommunity.id,
    secondCommunity.id,
  );
  TestValidator.notEquals(
    "community slugs must differ",
    firstCommunity.slug,
    secondCommunity.slug,
  );
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: firstCommunity.slug,
        },
        body: {
          member_code: moderatorMember.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "assignment belongs to first community",
    moderatorAssignment.community.id,
    firstCommunity.id,
  );
  TestValidator.equals(
    "assignment targets selected member",
    moderatorAssignment.member.id,
    moderatorMember.id,
  );
  await TestValidator.error(
    "cross-community moderator detail mismatch must be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.at(
        ownerConnection,
        {
          communityId: secondCommunity.id,
          moderatorId: moderatorAssignment.id,
        },
      );
    },
  );
}
