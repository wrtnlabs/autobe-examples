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

export async function test_api_community_moderator_assignment_by_owner(
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
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuth = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(targetMemberAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const assignment =
    await api.functional.communityPlatform.member.communities.moderators.update(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: targetMemberAuth.id,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "assignment community id matches created community",
    assignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "assignment community slug matches created community",
    assignment.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "assignment community title matches created community",
    assignment.community.title,
    community.title,
  );
  TestValidator.equals(
    "assignment community description matches created community",
    assignment.community.description,
    community.description,
  );
  TestValidator.equals(
    "assigned moderator member id matches target member",
    assignment.member.id,
    targetMemberAuth.id,
  );
  TestValidator.equals(
    "granted by member is the owner",
    assignment.grantedByMember.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "community owner remains the original owner",
    community.member.id,
    ownerAuth.id,
  );
  TestValidator.notEquals(
    "moderator assignment does not transfer ownership",
    assignment.member.id,
    community.member.id,
  );
  TestValidator.equals(
    "revoked by member remains null",
    assignment.revokedByMember,
    null,
  );
  TestValidator.equals("revoked at remains null", assignment.revoked_at, null);
  TestValidator.equals(
    "revocation reason remains null",
    assignment.revocation_reason,
    null,
  );
  const normalizedRole = assignment.role.toLowerCase();
  const normalizedStatus = assignment.status.toLowerCase();
  TestValidator.predicate(
    "role indicates moderator standing",
    assignment.role.length > 0 &&
      (normalizedRole === "moderator" ||
        normalizedRole === "mod" ||
        normalizedRole.includes("moder")),
  );
  TestValidator.predicate(
    "status indicates active assignment",
    assignment.status.length > 0 &&
      (normalizedStatus === "active" || normalizedStatus.includes("active")),
  );
}
