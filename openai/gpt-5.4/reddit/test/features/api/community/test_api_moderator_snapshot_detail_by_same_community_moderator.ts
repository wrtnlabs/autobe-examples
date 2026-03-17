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

export async function test_api_moderator_snapshot_detail_by_same_community_moderator(
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
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(
    moderatorMemberConnection,
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
  typia.assert(moderatorAuthorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const moderator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug satisfies string as string as string &
            tags.Format<"uuid">,
        },
        body: {
          member_code: moderatorAuthorized.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  const createdSnapshot =
    await api.functional.communityPlatform.member.communities.moderators.snapshots.create(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
      },
    );
  typia.assert(createdSnapshot);
  const snapshot =
    await api.functional.communityPlatform.member.communities.moderators.snapshots.at(
      moderatorMemberConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        snapshotId: createdSnapshot.id,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id matches", snapshot.id, createdSnapshot.id);
  TestValidator.equals(
    "snapshot belongs to moderator assignment",
    snapshot.communityModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator assignment belongs to community",
    snapshot.communityModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community slug matches requested hierarchy",
    snapshot.communityModerator.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "assigned moderator member id matches",
    snapshot.communityModerator.member.id,
    moderatorAuthorized.id,
  );
  TestValidator.equals(
    "assigned moderator member code matches",
    snapshot.communityModerator.member.code,
    moderatorAuthorized.code,
  );
  TestValidator.notEquals(
    "grantor differs from assigned moderator",
    snapshot.communityModerator.grantedByMember.id,
    snapshot.communityModerator.member.id,
  );
  TestValidator.equals(
    "moderator status preserved",
    snapshot.communityModerator.status,
    moderator.status,
  );
  TestValidator.equals(
    "moderator role preserved",
    snapshot.communityModerator.role,
    moderator.role,
  );
}
