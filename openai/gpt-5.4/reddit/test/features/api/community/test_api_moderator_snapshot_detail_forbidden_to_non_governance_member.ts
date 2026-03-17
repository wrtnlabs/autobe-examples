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

export async function test_api_moderator_snapshot_detail_forbidden_to_non_governance_member(
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
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsiderAuth = await authorize_member_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(outsiderAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const moderator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorMemberAuth.code,
        },
      },
    );
  typia.assert(moderator);
  const snapshot =
    await api.functional.communityPlatform.member.communities.moderators.snapshots.create(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
      },
    );
  typia.assert(snapshot);
  const baselineSnapshotId = snapshot.id;
  const baselineSnapshotCreatedAt = snapshot.created_at;
  const baselineSnapshotModeratorId = snapshot.communityModerator.id;
  const baselineModeratorId = moderator.id;
  const baselineModeratorCommunityId = moderator.community.id;
  const baselineModeratorMemberId = moderator.member.id;
  const baselineModeratorGrantedByMemberId = moderator.grantedByMember.id;
  const baselineModeratorRole = moderator.role;
  const baselineModeratorStatus = moderator.status;
  const baselineModeratorGrantedAt = moderator.granted_at;
  const baselineModeratorRevokedAt = moderator.revoked_at;
  const baselineModeratorRevocationReason = moderator.revocation_reason;
  TestValidator.equals(
    "snapshot parent moderator id matches created moderator",
    baselineSnapshotModeratorId,
    baselineModeratorId,
  );
  TestValidator.equals(
    "moderator community matches created community",
    baselineModeratorCommunityId,
    community.id,
  );
  await TestValidator.httpError(
    "ordinary member without governance standing cannot read moderator snapshot detail",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.snapshots.at(
        outsiderConnection,
        {
          communityId: community.id,
          moderatorId: moderator.id,
          snapshotId: snapshot.id,
        },
      );
    },
  );
  TestValidator.equals(
    "snapshot id remains unchanged after forbidden read",
    snapshot.id,
    baselineSnapshotId,
  );
  TestValidator.equals(
    "snapshot created_at remains unchanged after forbidden read",
    snapshot.created_at,
    baselineSnapshotCreatedAt,
  );
  TestValidator.equals(
    "snapshot moderator reference remains unchanged after forbidden read",
    snapshot.communityModerator.id,
    baselineSnapshotModeratorId,
  );
  TestValidator.equals(
    "moderator id remains unchanged after forbidden read",
    moderator.id,
    baselineModeratorId,
  );
  TestValidator.equals(
    "moderator community remains unchanged after forbidden read",
    moderator.community.id,
    baselineModeratorCommunityId,
  );
  TestValidator.equals(
    "moderator member remains unchanged after forbidden read",
    moderator.member.id,
    baselineModeratorMemberId,
  );
  TestValidator.equals(
    "moderator granted-by member remains unchanged after forbidden read",
    moderator.grantedByMember.id,
    baselineModeratorGrantedByMemberId,
  );
  TestValidator.equals(
    "moderator role remains unchanged after forbidden read",
    moderator.role,
    baselineModeratorRole,
  );
  TestValidator.equals(
    "moderator status remains unchanged after forbidden read",
    moderator.status,
    baselineModeratorStatus,
  );
  TestValidator.equals(
    "moderator granted_at remains unchanged after forbidden read",
    moderator.granted_at,
    baselineModeratorGrantedAt,
  );
  TestValidator.equals(
    "moderator revoked_at remains unchanged after forbidden read",
    moderator.revoked_at,
    baselineModeratorRevokedAt,
  );
  TestValidator.equals(
    "moderator revocation reason remains unchanged after forbidden read",
    moderator.revocation_reason,
    baselineModeratorRevocationReason,
  );
}
