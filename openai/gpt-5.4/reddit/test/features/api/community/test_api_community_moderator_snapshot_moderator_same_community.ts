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

export async function test_api_community_moderator_snapshot_moderator_same_community(
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
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstModeratorAuthorized = await authorize_member_join(
    firstModeratorConnection,
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
  typia.assert(firstModeratorAuthorized);
  const firstModeratorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.id,
        },
        body: {
          member_code: firstModeratorAuthorized.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(firstModeratorAssignment);
  TestValidator.equals(
    "first moderator assignment belongs to created community",
    firstModeratorAssignment.community.id,
    community.id,
  );
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModeratorAuthorized = await authorize_member_join(
    secondModeratorConnection,
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
  typia.assert(secondModeratorAuthorized);
  const secondModeratorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.id,
        },
        body: {
          member_code: secondModeratorAuthorized.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModeratorAssignment);
  TestValidator.equals(
    "second moderator assignment belongs to created community",
    secondModeratorAssignment.community.id,
    community.id,
  );
  const snapshot =
    await api.functional.communityPlatform.member.communities.moderators.snapshots.create(
      firstModeratorConnection,
      {
        communityId: community.id,
        moderatorId: secondModeratorAssignment.id,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot targets addressed moderator assignment",
    snapshot.communityModerator.id,
    secondModeratorAssignment.id,
  );
  TestValidator.equals(
    "snapshot nested community matches target community",
    snapshot.communityModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot nested community matches addressed assignment community",
    snapshot.communityModerator.community.id,
    secondModeratorAssignment.community.id,
  );
  TestValidator.equals(
    "snapshot nested assignment member matches second moderator",
    snapshot.communityModerator.member.id,
    secondModeratorAssignment.member.id,
  );
  TestValidator.equals(
    "snapshot preserves granting member",
    snapshot.communityModerator.grantedByMember.id,
    secondModeratorAssignment.grantedByMember.id,
  );
  TestValidator.equals(
    "snapshot preserves owner as original grantor",
    snapshot.communityModerator.grantedByMember.id,
    community.member.id,
  );
  TestValidator.notEquals(
    "acting moderator differs from target moderator",
    firstModeratorAssignment.id,
    secondModeratorAssignment.id,
  );
  TestValidator.notEquals(
    "acting moderator member differs from target moderator member",
    firstModeratorAssignment.member.id,
    secondModeratorAssignment.member.id,
  );
  TestValidator.equals(
    "snapshot preserves role",
    snapshot.communityModerator.role,
    secondModeratorAssignment.role,
  );
  TestValidator.equals(
    "snapshot preserves status",
    snapshot.communityModerator.status,
    secondModeratorAssignment.status,
  );
  TestValidator.equals(
    "snapshot preserves granted timestamp",
    snapshot.communityModerator.granted_at,
    secondModeratorAssignment.granted_at,
  );
  TestValidator.equals(
    "snapshot preserves revoked by member",
    snapshot.communityModerator.revokedByMember,
    secondModeratorAssignment.revokedByMember,
  );
  TestValidator.equals(
    "snapshot preserves revoked timestamp",
    snapshot.communityModerator.revoked_at,
    secondModeratorAssignment.revoked_at,
  );
  TestValidator.equals(
    "snapshot preserves revocation reason",
    snapshot.communityModerator.revocation_reason,
    secondModeratorAssignment.revocation_reason,
  );
  TestValidator.equals(
    "snapshot preserves deleted timestamp",
    snapshot.communityModerator.deleted_at,
    secondModeratorAssignment.deleted_at,
  );
}
