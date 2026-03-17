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

export async function test_api_community_moderator_snapshot_owner_creation(
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
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
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
      },
    },
  );
  typia.assert(moderatorAuthorized);
  const moderator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorAuthorized.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "owner granted the moderator assignment",
    moderator.grantedByMember.id,
    ownerAuthorized.id,
  );
  TestValidator.equals(
    "moderator assignment belongs to created community",
    moderator.community.id,
    community.id,
  );
  const snapshot =
    await api.functional.communityPlatform.member.communities.moderators.snapshots.create(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
      },
    );
  typia.assert(snapshot);
  TestValidator.notEquals(
    "snapshot has its own identity",
    snapshot.id,
    moderator.id,
  );
  TestValidator.equals(
    "snapshot references same moderator assignment",
    snapshot.communityModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "snapshot preserves moderator role",
    snapshot.communityModerator.role,
    moderator.role,
  );
  TestValidator.equals(
    "snapshot preserves moderator status",
    snapshot.communityModerator.status,
    moderator.status,
  );
  TestValidator.equals(
    "snapshot preserves granted timestamp",
    snapshot.communityModerator.granted_at,
    moderator.granted_at,
  );
  TestValidator.equals(
    "snapshot preserves revoked timestamp",
    snapshot.communityModerator.revoked_at,
    moderator.revoked_at,
  );
  TestValidator.equals(
    "snapshot preserves revocation reason",
    snapshot.communityModerator.revocation_reason,
    moderator.revocation_reason,
  );
  TestValidator.equals(
    "snapshot preserves community id",
    snapshot.communityModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot preserves community slug",
    snapshot.communityModerator.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "snapshot preserves assigned member id",
    snapshot.communityModerator.member.id,
    moderator.member.id,
  );
  TestValidator.equals(
    "snapshot preserves owner grantor id",
    snapshot.communityModerator.grantedByMember.id,
    ownerAuthorized.id,
  );
  TestValidator.equals(
    "snapshot preserves revoked by member",
    snapshot.communityModerator.revokedByMember,
    moderator.revokedByMember,
  );
  TestValidator.predicate(
    "snapshot records created_at timestamp",
    snapshot.created_at.length > 0,
  );
}
