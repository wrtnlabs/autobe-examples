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

export async function test_api_community_moderator_owner_promotion_by_moderator(
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
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
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
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(firstModeratorAuth);
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModeratorAuth = await authorize_member_join(
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
  typia.assert(secondModeratorAuth);
  const firstAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.id,
        },
        body: {
          member_code: firstModeratorAuth.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(firstAssignment);
  TestValidator.equals(
    "first moderator assignment belongs to the created community",
    firstAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "first moderator assignment references the promoting moderator member",
    firstAssignment.member.id,
    firstModeratorAuth.id,
  );
  const secondAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.id,
        },
        body: {
          member_code: secondModeratorAuth.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(secondAssignment);
  const promoted =
    await api.functional.communityPlatform.member.communities.moderators.owners.create(
      firstModeratorConnection,
      {
        communityId: community.id,
        moderatorId: secondAssignment.id,
      },
    );
  typia.assert(promoted);
  TestValidator.equals(
    "promoted assignment remains in the same community",
    promoted.community.id,
    community.id,
  );
  TestValidator.equals(
    "promoted assignment targets the intended moderator assignment",
    promoted.id,
    secondAssignment.id,
  );
  TestValidator.equals(
    "promoted assignment still references the second moderator member",
    promoted.member.id,
    secondModeratorAuth.id,
  );
  TestValidator.predicate(
    "promoted assignment remains active",
    /active/i.test(promoted.status),
  );
  TestValidator.equals(
    "promotion does not revoke the assignment",
    promoted.revoked_at,
    null,
  );
  TestValidator.equals(
    "promotion does not set revoked by member",
    promoted.revokedByMember,
    null,
  );
  TestValidator.equals(
    "promotion does not soft delete the assignment",
    promoted.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "role changes from moderator standing to owner standing",
    promoted.role,
    secondAssignment.role,
  );
  TestValidator.predicate(
    "promoted role includes owner semantics",
    /owner/i.test(promoted.role),
  );
  TestValidator.equals(
    "response remains scoped to the same community slug",
    promoted.community.slug,
    community.slug,
  );
}
