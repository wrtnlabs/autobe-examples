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

export async function test_api_moderator_snapshot_detail_by_owner(
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
  const community =
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
  const detail =
    await api.functional.communityPlatform.member.communities.moderators.snapshots.at(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("snapshot id matches", detail.id, snapshot.id);
  TestValidator.equals(
    "snapshot created_at matches",
    detail.created_at,
    snapshot.created_at,
  );
  TestValidator.equals(
    "moderator assignment id matches",
    detail.communityModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator role unchanged",
    detail.communityModerator.role,
    moderator.role,
  );
  TestValidator.equals(
    "moderator status unchanged",
    detail.communityModerator.status,
    moderator.status,
  );
  TestValidator.equals(
    "moderator granted_at unchanged",
    detail.communityModerator.granted_at,
    moderator.granted_at,
  );
  TestValidator.equals(
    "moderator revoked_at unchanged",
    detail.communityModerator.revoked_at,
    moderator.revoked_at,
  );
  TestValidator.equals(
    "moderator revocation_reason unchanged",
    detail.communityModerator.revocation_reason,
    moderator.revocation_reason,
  );
  TestValidator.equals(
    "moderator created_at unchanged",
    detail.communityModerator.created_at,
    moderator.created_at,
  );
  TestValidator.equals(
    "moderator updated_at unchanged",
    detail.communityModerator.updated_at,
    moderator.updated_at,
  );
  TestValidator.equals(
    "moderator deleted_at unchanged",
    detail.communityModerator.deleted_at,
    moderator.deleted_at,
  );
  TestValidator.equals(
    "community id matches assignment context",
    detail.communityModerator.community.id,
    moderator.community.id,
  );
  TestValidator.equals(
    "community slug matches assignment context",
    detail.communityModerator.community.slug,
    moderator.community.slug,
  );
  TestValidator.equals(
    "community title matches assignment context",
    detail.communityModerator.community.title,
    moderator.community.title,
  );
  TestValidator.equals(
    "community description matches assignment context",
    detail.communityModerator.community.description,
    moderator.community.description,
  );
  TestValidator.equals(
    "community status matches assignment context",
    detail.communityModerator.community.status,
    moderator.community.status,
  );
  TestValidator.equals(
    "community subscriber_count matches assignment context",
    detail.communityModerator.community.subscriber_count,
    moderator.community.subscriber_count,
  );
  TestValidator.equals(
    "community created_at matches assignment context",
    detail.communityModerator.community.created_at,
    moderator.community.created_at,
  );
  TestValidator.equals(
    "community updated_at matches assignment context",
    detail.communityModerator.community.updated_at,
    moderator.community.updated_at,
  );
  TestValidator.equals(
    "community deleted_at matches assignment context",
    detail.communityModerator.community.deleted_at,
    moderator.community.deleted_at,
  );
  TestValidator.equals(
    "community id remains original",
    detail.communityModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community slug remains original",
    detail.communityModerator.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "community title remains original",
    detail.communityModerator.community.title,
    community.title,
  );
  TestValidator.equals(
    "community description remains original",
    detail.communityModerator.community.description,
    community.description,
  );
  TestValidator.equals(
    "community status remains original",
    detail.communityModerator.community.status,
    community.status,
  );
  TestValidator.equals(
    "community created_at remains original",
    detail.communityModerator.community.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "community updated_at remains original",
    detail.communityModerator.community.updated_at,
    community.updated_at,
  );
  TestValidator.equals(
    "community deleted_at remains original",
    detail.communityModerator.community.deleted_at,
    community.deleted_at,
  );
  TestValidator.equals(
    "community owner id matches",
    detail.communityModerator.community.member.id,
    moderator.community.member.id,
  );
  TestValidator.equals(
    "community owner code matches",
    detail.communityModerator.community.member.code,
    moderator.community.member.code,
  );
  TestValidator.equals(
    "community owner email matches",
    detail.communityModerator.community.member.email,
    moderator.community.member.email,
  );
  TestValidator.equals(
    "community owner email_verified matches",
    detail.communityModerator.community.member.email_verified,
    moderator.community.member.email_verified,
  );
  TestValidator.equals(
    "community owner status matches",
    detail.communityModerator.community.member.status,
    moderator.community.member.status,
  );
  TestValidator.equals(
    "community owner last_signed_in_at matches",
    detail.communityModerator.community.member.last_signed_in_at,
    moderator.community.member.last_signed_in_at,
  );
  TestValidator.equals(
    "community owner created_at matches",
    detail.communityModerator.community.member.created_at,
    moderator.community.member.created_at,
  );
  TestValidator.equals(
    "community owner updated_at matches",
    detail.communityModerator.community.member.updated_at,
    moderator.community.member.updated_at,
  );
  TestValidator.equals(
    "community owner deleted_at matches",
    detail.communityModerator.community.member.deleted_at,
    moderator.community.member.deleted_at,
  );
  TestValidator.equals(
    "assigned moderator member id matches",
    detail.communityModerator.member.id,
    moderator.member.id,
  );
  TestValidator.equals(
    "assigned moderator member code matches",
    detail.communityModerator.member.code,
    moderator.member.code,
  );
  TestValidator.equals(
    "assigned moderator member email matches",
    detail.communityModerator.member.email,
    moderator.member.email,
  );
  TestValidator.equals(
    "assigned moderator member email_verified matches",
    detail.communityModerator.member.email_verified,
    moderator.member.email_verified,
  );
  TestValidator.equals(
    "assigned moderator member status matches",
    detail.communityModerator.member.status,
    moderator.member.status,
  );
  TestValidator.equals(
    "assigned moderator member last_signed_in_at matches",
    detail.communityModerator.member.last_signed_in_at,
    moderator.member.last_signed_in_at,
  );
  TestValidator.equals(
    "assigned moderator member created_at matches",
    detail.communityModerator.member.created_at,
    moderator.member.created_at,
  );
  TestValidator.equals(
    "assigned moderator member updated_at matches",
    detail.communityModerator.member.updated_at,
    moderator.member.updated_at,
  );
  TestValidator.equals(
    "assigned moderator member deleted_at matches",
    detail.communityModerator.member.deleted_at,
    moderator.member.deleted_at,
  );
  TestValidator.equals(
    "granting member id matches",
    detail.communityModerator.grantedByMember.id,
    moderator.grantedByMember.id,
  );
  TestValidator.equals(
    "granting member code matches",
    detail.communityModerator.grantedByMember.code,
    moderator.grantedByMember.code,
  );
  TestValidator.equals(
    "granting member email matches",
    detail.communityModerator.grantedByMember.email,
    moderator.grantedByMember.email,
  );
  TestValidator.equals(
    "granting member email_verified matches",
    detail.communityModerator.grantedByMember.email_verified,
    moderator.grantedByMember.email_verified,
  );
  TestValidator.equals(
    "granting member status matches",
    detail.communityModerator.grantedByMember.status,
    moderator.grantedByMember.status,
  );
  TestValidator.equals(
    "granting member last_signed_in_at matches",
    detail.communityModerator.grantedByMember.last_signed_in_at,
    moderator.grantedByMember.last_signed_in_at,
  );
  TestValidator.equals(
    "granting member created_at matches",
    detail.communityModerator.grantedByMember.created_at,
    moderator.grantedByMember.created_at,
  );
  TestValidator.equals(
    "granting member updated_at matches",
    detail.communityModerator.grantedByMember.updated_at,
    moderator.grantedByMember.updated_at,
  );
  TestValidator.equals(
    "granting member deleted_at matches",
    detail.communityModerator.grantedByMember.deleted_at,
    moderator.grantedByMember.deleted_at,
  );
}
