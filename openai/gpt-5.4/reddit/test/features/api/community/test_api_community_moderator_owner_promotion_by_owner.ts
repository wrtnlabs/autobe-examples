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

export async function test_api_community_moderator_owner_promotion_by_owner(
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
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
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
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(moderatorMemberAuth);
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.id,
        },
        body: {
          member_code: moderatorMemberAuth.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  const promoted =
    await api.functional.communityPlatform.member.communities.moderators.owners.create(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
      },
    );
  typia.assert(promoted);
  TestValidator.equals(
    "assignment id remains the same",
    promoted.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "community context remains the same",
    promoted.community.id,
    community.id,
  );
  TestValidator.equals(
    "target member remains the same",
    promoted.member.id,
    moderatorAssignment.member.id,
  );
  TestValidator.equals(
    "grant metadata remains the same",
    promoted.grantedByMember.id,
    moderatorAssignment.grantedByMember.id,
  );
  TestValidator.equals("assignment remains active", promoted.status, "active");
  TestValidator.equals("revokedAt stays null", promoted.revoked_at, null);
  TestValidator.equals(
    "revokedByMember stays null",
    promoted.revokedByMember,
    null,
  );
  TestValidator.equals(
    "revocation reason stays null",
    promoted.revocation_reason,
    null,
  );
  TestValidator.equals("deletedAt stays null", promoted.deleted_at, null);
  TestValidator.notEquals(
    "role changes from moderator standing",
    promoted.role,
    moderatorAssignment.role,
  );
  TestValidator.predicate(
    "role becomes owner aligned",
    promoted.role.toLowerCase().includes("owner"),
  );
}
