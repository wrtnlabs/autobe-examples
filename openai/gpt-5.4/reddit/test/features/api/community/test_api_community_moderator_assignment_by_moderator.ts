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

export async function test_api_community_moderator_assignment_by_moderator(
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
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstModeratorAuth = await authorize_member_join(
    firstModeratorConnection,
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
  typia.assert(firstModeratorAuth);
  const firstModeratorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: firstModeratorAuth.code,
        },
      },
    );
  typia.assert(firstModeratorAssignment);
  TestValidator.equals(
    "first moderator assignment targets second member id",
    firstModeratorAssignment.member.id,
    firstModeratorAuth.id,
  );
  TestValidator.equals(
    "first moderator assignment targets second member code",
    firstModeratorAssignment.member.code,
    firstModeratorAuth.code,
  );
  TestValidator.equals(
    "first moderator assignment granted by owner id",
    firstModeratorAssignment.grantedByMember.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "first moderator assignment granted by owner code",
    firstModeratorAssignment.grantedByMember.code,
    ownerAuth.code,
  );
  const targetModeratorConnection: api.IConnection = { host: connection.host };
  const targetModeratorAuth = await authorize_member_join(
    targetModeratorConnection,
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
  typia.assert(targetModeratorAuth);
  const delegatedAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      firstModeratorConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: targetModeratorAuth.code,
        },
      },
    );
  typia.assert(delegatedAssignment);
  TestValidator.equals(
    "delegated assignment uses same community id",
    delegatedAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "delegated assignment uses same community slug",
    delegatedAssignment.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "delegated assignment community matches first moderator assignment scope",
    delegatedAssignment.community.slug,
    firstModeratorAssignment.community.slug,
  );
  TestValidator.equals(
    "delegated assignment targets third member",
    delegatedAssignment.member.id,
    targetModeratorAuth.id,
  );
  TestValidator.equals(
    "delegated assignment targets third member code",
    delegatedAssignment.member.code,
    targetModeratorAuth.code,
  );
  TestValidator.equals(
    "granted by acting moderator id",
    delegatedAssignment.grantedByMember.id,
    firstModeratorAuth.id,
  );
  TestValidator.equals(
    "granted by acting moderator code",
    delegatedAssignment.grantedByMember.code,
    firstModeratorAuth.code,
  );
  TestValidator.notEquals(
    "grantor is not owner id",
    delegatedAssignment.grantedByMember.id,
    ownerAuth.id,
  );
  TestValidator.notEquals(
    "assignment differs from first moderator assignment",
    delegatedAssignment.id,
    firstModeratorAssignment.id,
  );
  TestValidator.equals(
    "delegated assignment not revoked by anyone",
    delegatedAssignment.revokedByMember,
    null,
  );
  TestValidator.equals(
    "delegated assignment revoked at is null",
    delegatedAssignment.revoked_at,
    null,
  );
  TestValidator.equals(
    "delegated assignment revocation reason is null",
    delegatedAssignment.revocation_reason,
    null,
  );
  TestValidator.equals(
    "delegated assignment not soft deleted",
    delegatedAssignment.deleted_at,
    null,
  );
  TestValidator.predicate(
    "delegated assignment has non-empty role",
    delegatedAssignment.role.length > 0,
  );
  TestValidator.predicate(
    "delegated assignment has non-empty status",
    delegatedAssignment.status.length > 0,
  );
}
