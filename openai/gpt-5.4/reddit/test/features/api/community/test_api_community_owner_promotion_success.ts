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

export async function test_api_community_owner_promotion_success(
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
  TestValidator.equals(
    "community owner matches acting member",
    community.member.id,
    ownerAuthorized.id,
  );
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuthorized = await authorize_member_join(
    targetMemberConnection,
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
  typia.assert(targetMemberAuthorized);
  const moderator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.id,
        },
        body: {
          member_code: targetMemberAuthorized.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  const promoted =
    await api.functional.communityPlatform.member.communities.moderators.owners.promote(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
      },
    );
  typia.assert(promoted);
  TestValidator.notEquals(
    "owner subtype id differs from moderator assignment id",
    promoted.id,
    moderator.id,
  );
  TestValidator.equals(
    "owner subtype references same moderator assignment",
    promoted.communityModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "promoted assignment stays in same community id",
    promoted.communityModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "promoted assignment stays in same community slug",
    promoted.communityModerator.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "promoted assignment targets second member id",
    promoted.communityModerator.member.id,
    targetMemberAuthorized.id,
  );
  TestValidator.equals(
    "promoted assignment targets second member code",
    promoted.communityModerator.member.code,
    targetMemberAuthorized.code,
  );
  TestValidator.equals(
    "owner grantedByMember remains original owner",
    promoted.communityModerator.grantedByMember.id,
    ownerAuthorized.id,
  );
  TestValidator.equals(
    "promoted assignment revokedByMember remains null",
    promoted.communityModerator.revokedByMember,
    null,
  );
  TestValidator.equals(
    "promoted assignment revoked_at remains null",
    promoted.communityModerator.revoked_at,
    null,
  );
  TestValidator.equals(
    "promoted assignment revocation_reason remains null",
    promoted.communityModerator.revocation_reason,
    null,
  );
  TestValidator.equals(
    "promoted assignment deleted_at remains null",
    promoted.communityModerator.deleted_at,
    null,
  );
  TestValidator.predicate(
    "promoted assignment role is non-empty",
    promoted.communityModerator.role.length > 0,
  );
  TestValidator.predicate(
    "promoted assignment status is non-empty",
    promoted.communityModerator.status.length > 0,
  );
}
