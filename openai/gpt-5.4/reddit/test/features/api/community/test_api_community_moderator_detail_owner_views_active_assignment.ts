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

export async function test_api_community_moderator_detail_owner_views_active_assignment(
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
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const createdModerator =
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
  typia.assert(createdModerator);
  const detail =
    await api.functional.communityPlatform.member.communities.moderators.at(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: createdModerator.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "moderator assignment id",
    detail.id,
    createdModerator.id,
  );
  TestValidator.equals("community id", detail.community.id, community.id);
  TestValidator.equals("community slug", detail.community.slug, community.slug);
  TestValidator.equals(
    "community title",
    detail.community.title,
    community.title,
  );
  TestValidator.equals(
    "community description",
    detail.community.description,
    community.description,
  );
  TestValidator.equals(
    "community status",
    detail.community.status,
    community.status,
  );
  TestValidator.equals(
    "community owner id",
    detail.community.member.id,
    community.member.id,
  );
  TestValidator.equals(
    "community owner code",
    detail.community.member.code,
    community.member.code,
  );
  TestValidator.equals(
    "community owner email",
    detail.community.member.email,
    community.member.email,
  );
  TestValidator.equals(
    "community owner email verified",
    detail.community.member.email_verified,
    community.member.email_verified,
  );
  TestValidator.equals(
    "community owner status",
    detail.community.member.status,
    community.member.status,
  );
  TestValidator.equals(
    "community owner last signed in at",
    detail.community.member.last_signed_in_at,
    community.member.last_signed_in_at,
  );
  TestValidator.equals(
    "community owner created at",
    detail.community.member.created_at,
    community.member.created_at,
  );
  TestValidator.equals(
    "community owner updated at",
    detail.community.member.updated_at,
    community.member.updated_at,
  );
  TestValidator.equals(
    "community owner deleted at",
    detail.community.member.deleted_at,
    community.member.deleted_at,
  );
  TestValidator.equals(
    "community subscriber count",
    detail.community.subscriber_count,
    community.subscriber_count,
  );
  TestValidator.equals(
    "community created at",
    detail.community.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "community updated at",
    detail.community.updated_at,
    community.updated_at,
  );
  TestValidator.equals(
    "community deleted at",
    detail.community.deleted_at,
    community.deleted_at,
  );
  TestValidator.equals(
    "assigned member id",
    detail.member.id,
    moderatorAuthorized.id,
  );
  TestValidator.equals(
    "assigned member code",
    detail.member.code,
    moderatorAuthorized.code,
  );
  TestValidator.equals(
    "assigned member email",
    detail.member.email,
    moderatorAuthorized.email,
  );
  TestValidator.equals(
    "assigned member email verified",
    detail.member.email_verified,
    moderatorAuthorized.emailVerified,
  );
  TestValidator.equals(
    "assigned member status",
    detail.member.status,
    moderatorAuthorized.status,
  );
  TestValidator.equals(
    "assigned member last signed in at",
    detail.member.last_signed_in_at,
    moderatorAuthorized.lastSignedInAt,
  );
  TestValidator.equals(
    "assigned member created at",
    detail.member.created_at,
    moderatorAuthorized.createdAt,
  );
  TestValidator.equals(
    "assigned member updated at",
    detail.member.updated_at,
    moderatorAuthorized.updatedAt,
  );
  TestValidator.equals(
    "assigned member deleted at",
    detail.member.deleted_at,
    moderatorAuthorized.deletedAt,
  );
  TestValidator.equals(
    "granting member id",
    detail.grantedByMember.id,
    ownerAuthorized.id,
  );
  TestValidator.equals(
    "granting member code",
    detail.grantedByMember.code,
    ownerAuthorized.code,
  );
  TestValidator.equals(
    "granting member email",
    detail.grantedByMember.email,
    ownerAuthorized.email,
  );
  TestValidator.equals(
    "granting member email verified",
    detail.grantedByMember.email_verified,
    ownerAuthorized.emailVerified,
  );
  TestValidator.equals(
    "granting member status",
    detail.grantedByMember.status,
    ownerAuthorized.status,
  );
  TestValidator.equals(
    "granting member last signed in at",
    detail.grantedByMember.last_signed_in_at,
    ownerAuthorized.lastSignedInAt,
  );
  TestValidator.equals(
    "granting member created at",
    detail.grantedByMember.created_at,
    ownerAuthorized.createdAt,
  );
  TestValidator.equals(
    "granting member updated at",
    detail.grantedByMember.updated_at,
    ownerAuthorized.updatedAt,
  );
  TestValidator.equals(
    "granting member deleted at",
    detail.grantedByMember.deleted_at,
    ownerAuthorized.deletedAt,
  );
  TestValidator.equals("revoked by member", detail.revokedByMember, null);
  TestValidator.equals(
    "role matches creation",
    detail.role,
    createdModerator.role,
  );
  TestValidator.equals(
    "status matches creation",
    detail.status,
    createdModerator.status,
  );
  TestValidator.predicate("role is non-empty", detail.role.length > 0);
  TestValidator.predicate("status is non-empty", detail.status.length > 0);
  TestValidator.equals(
    "granted at matches creation",
    detail.granted_at,
    createdModerator.granted_at,
  );
  TestValidator.equals("revoked at is null", detail.revoked_at, null);
  TestValidator.equals(
    "revocation reason is null",
    detail.revocation_reason,
    null,
  );
  TestValidator.equals(
    "created at matches creation",
    detail.created_at,
    createdModerator.created_at,
  );
  TestValidator.equals(
    "updated at matches creation",
    detail.updated_at,
    createdModerator.updated_at,
  );
  TestValidator.equals("deleted at is null", detail.deleted_at, null);
}
