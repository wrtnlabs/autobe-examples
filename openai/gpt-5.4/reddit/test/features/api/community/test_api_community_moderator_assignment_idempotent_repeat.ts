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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_moderator_assignment_idempotent_repeat(
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
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(community);
  const candidateConnection: api.IConnection = { host: connection.host };
  const candidateAuth = await authorize_member_join(candidateConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(candidateAuth);
  const firstAssignment =
    await api.functional.communityPlatform.member.communities.moderators.update(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: candidateAuth.id,
      },
    );
  typia.assert(firstAssignment);
  const secondAssignment =
    await api.functional.communityPlatform.member.communities.moderators.update(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: candidateAuth.id,
      },
    );
  typia.assert(secondAssignment);
  TestValidator.equals(
    "idempotent assignment id is stable",
    secondAssignment.id,
    firstAssignment.id,
  );
  TestValidator.equals(
    "first assignment community matches created community",
    firstAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "second assignment community matches created community",
    secondAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "repeated assignment community remains unchanged",
    secondAssignment.community.id,
    firstAssignment.community.id,
  );
  TestValidator.equals(
    "first assignment member matches candidate member",
    firstAssignment.member.id,
    candidateAuth.id,
  );
  TestValidator.equals(
    "second assignment member matches candidate member",
    secondAssignment.member.id,
    candidateAuth.id,
  );
  TestValidator.equals(
    "repeated assignment member remains unchanged",
    secondAssignment.member.id,
    firstAssignment.member.id,
  );
  TestValidator.equals(
    "first grantedByMember is owner",
    firstAssignment.grantedByMember.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "second grantedByMember is owner",
    secondAssignment.grantedByMember.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "repeated assignment granter remains unchanged",
    secondAssignment.grantedByMember.id,
    firstAssignment.grantedByMember.id,
  );
  TestValidator.equals(
    "role remains unchanged on repeat",
    secondAssignment.role,
    firstAssignment.role,
  );
  TestValidator.equals(
    "status remains unchanged on repeat",
    secondAssignment.status,
    firstAssignment.status,
  );
  TestValidator.equals(
    "revokedByMember remains null on first assignment",
    firstAssignment.revokedByMember,
    null,
  );
  TestValidator.equals(
    "revokedByMember remains null on repeated assignment",
    secondAssignment.revokedByMember,
    null,
  );
  TestValidator.equals(
    "revoked_at remains null on first assignment",
    firstAssignment.revoked_at,
    null,
  );
  TestValidator.equals(
    "revoked_at remains null on repeated assignment",
    secondAssignment.revoked_at,
    null,
  );
}
