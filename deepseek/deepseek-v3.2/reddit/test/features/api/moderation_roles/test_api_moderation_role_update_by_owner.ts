import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_moderation_role_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create community owner (member) account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
  });
  typia.assert(ownerAuth);
  // Step 2: Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // Step 3: Create another member to assign as moderator
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorMemberAuth = await authorize_member_join(
    moderatorMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
    },
  );
  typia.assert(moderatorMemberAuth);
  // Step 4: Owner creates initial moderator role (owner assigns themselves as assigned_by)
  const initialRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderatorMemberAuth.id,
          roleType: "moderator",
        } satisfies DeepPartial<ICommunityPlatformModerationRole.ICreate>,
      },
    );
  typia.assert(initialRole);
  // Verify initial assignedBy is owner
  TestValidator.equals(
    "initial assignedBy is owner",
    initialRole.assignedBy?.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "role type is moderator",
    initialRole.roleType,
    "moderator",
  );
  // Step 5: Owner updates the assigned_by field to themselves (owner)
  const updateResponse =
    await api.functional.communityPlatform.member.communities.moderation_roles.update(
      ownerConnection,
      {
        communityId: community.id,
        roleId: initialRole.id,
        body: {
          assigned_by_member_id: ownerAuth.id,
        } satisfies ICommunityPlatformModerationRole.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // Step 6: Validate response
  TestValidator.equals("role id unchanged", updateResponse.id, initialRole.id);
  TestValidator.equals(
    "role type unchanged",
    updateResponse.roleType,
    "moderator",
  );
  TestValidator.equals(
    "assignedBy updated to owner",
    updateResponse.assignedBy?.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "member unchanged",
    updateResponse.member.id,
    moderatorMemberAuth.id,
  );
  TestValidator.equals(
    "community unchanged",
    updateResponse.community.id,
    community.id,
  );
  TestValidator.predicate(
    "updated_at should be recent",
    updateResponse.updatedAt !== initialRole.updatedAt,
  );
}
