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

export async function test_api_community_owner_record_nested_chain_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
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
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(communityB);
  const moderatorA =
    await generate_random_community_platform_member_communities_moderators_create(
      memberConnection,
      {
        params: {
          communitySlug: communityA.slug,
        },
        body: {
          member_code: authorized.code,
        },
      },
    );
  typia.assert(moderatorA);
  const moderatorB =
    await generate_random_community_platform_member_communities_moderators_create(
      memberConnection,
      {
        params: {
          communitySlug: communityB.slug,
        },
        body: {
          member_code: authorized.code,
        },
      },
    );
  typia.assert(moderatorB);
  const missingOwnerIdA = typia.random<string & tags.Format<"uuid">>();
  const missingOwnerIdB = typia.random<string & tags.Format<"uuid">>();
  const missingOwnerIdC = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "rejects missing owner under valid community A and moderator A",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.owners.at(
        memberConnection,
        {
          communityId: communityA.id,
          moderatorId: moderatorA.id,
          ownerId: missingOwnerIdA,
        },
      );
    },
  );
  await TestValidator.error(
    "rejects community A with moderator B and unrelated owner id",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.owners.at(
        memberConnection,
        {
          communityId: communityA.id,
          moderatorId: moderatorB.id,
          ownerId: missingOwnerIdB,
        },
      );
    },
  );
  await TestValidator.error(
    "rejects community B with moderator A and unrelated owner id",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.owners.at(
        memberConnection,
        {
          communityId: communityB.id,
          moderatorId: moderatorA.id,
          ownerId: missingOwnerIdC,
        },
      );
    },
  );
}
