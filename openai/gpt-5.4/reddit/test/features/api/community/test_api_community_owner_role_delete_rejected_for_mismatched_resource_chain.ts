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

export async function test_api_community_owner_role_delete_rejected_for_mismatched_resource_chain(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const primaryCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `primary-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(primaryCommunity);
  const secondaryCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `secondary-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondaryCommunity);
  TestValidator.notEquals(
    "communities must differ",
    primaryCommunity.id,
    secondaryCommunity.id,
  );
  const moderator =
    await generate_random_community_platform_member_communities_moderators_create(
      memberConnection,
      {
        params: {
          communitySlug: primaryCommunity.slug,
        },
        body: {
          member_code: member.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator belongs to primary community",
    moderator.community.id,
    primaryCommunity.id,
  );
  const ownerModerator =
    await api.functional.communityPlatform.member.communities.moderators.owners.create(
      memberConnection,
      {
        communityId: primaryCommunity.id,
        moderatorId: moderator.id,
      },
    );
  typia.assert(ownerModerator);
  TestValidator.equals(
    "owner subtype remains on moderator in primary community",
    ownerModerator.community.id,
    primaryCommunity.id,
  );
  const mismatchedOwnerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete rejects mismatched owner resource chain",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.owners.erase(
        memberConnection,
        {
          communityId: primaryCommunity.id,
          moderatorId: moderator.id,
          ownerId: mismatchedOwnerId,
        },
      );
    },
  );
  await TestValidator.error(
    "original owner subtype is preserved after mismatched delete attempt",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.owners.create(
        memberConnection,
        {
          communityId: primaryCommunity.id,
          moderatorId: moderator.id,
        },
      );
    },
  );
}
