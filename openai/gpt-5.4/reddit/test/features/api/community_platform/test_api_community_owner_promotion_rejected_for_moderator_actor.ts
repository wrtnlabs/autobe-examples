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

export async function test_api_community_owner_promotion_rejected_for_moderator_actor(
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
    },
  });
  typia.assert(ownerAuthorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuthorized);
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuthorized = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(targetAuthorized);
  const actingModeratorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorAuthorized.code,
        },
      },
    );
  typia.assert(actingModeratorAssignment);
  const targetModeratorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      moderatorConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: targetAuthorized.code,
        },
      },
    );
  typia.assert(targetModeratorAssignment);
  TestValidator.equals(
    "acting moderator belongs to created community",
    actingModeratorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "target moderator belongs to created community",
    targetModeratorAssignment.community.id,
    community.id,
  );
  TestValidator.notEquals(
    "target moderator differs from acting moderator",
    targetAuthorized.code,
    moderatorAuthorized.code,
  );
  TestValidator.equals(
    "target moderator was granted by acting moderator",
    targetModeratorAssignment.grantedByMember.id,
    actingModeratorAssignment.member.id,
  );
  await TestValidator.httpError(
    "moderator cannot promote another moderator to owner",
    [400, 403, 404, 409],
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.owners.promote(
        moderatorConnection,
        {
          communityId: community.id,
          moderatorId: targetModeratorAssignment.id,
        },
      );
    },
  );
}
