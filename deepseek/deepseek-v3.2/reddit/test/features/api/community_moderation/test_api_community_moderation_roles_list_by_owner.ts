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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationRole";
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

/**
 * Test that a community owner can successfully list all moderation roles for their community.
 * 1. Create a new member account through join authentication
 * 2. Create a new community, making the member the owner
 * 3. The owner calls the moderation roles list endpoint with the community ID
 * 4. Validate the paginated response contains their own owner role with correct roleType, member details, and assignedBy as null
 */
export async function test_api_community_moderation_roles_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate a new member using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(member);
  // 2. Create a community - member becomes owner using utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. List moderation roles for the community (owner should see their own role)
  const roles =
    await api.functional.communityPlatform.member.moderation_roles.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(roles);
  // 4. Validate data array contains at least the owner role
  TestValidator.predicate(
    "has at least one role",
    () => roles.data.length >= 1,
  );
  // 5. Find the owner role in the data
  const ownerRole = roles.data.find((role) => role.roleType === "owner");
  TestValidator.predicate("owner role exists", () => ownerRole !== undefined);
  // 6. Validate owner role business logic properties
  TestValidator.equals("role type is owner", ownerRole!.roleType, "owner");
  TestValidator.equals(
    "owner role assignedBy is null",
    ownerRole!.assignedBy,
    null,
  );
  TestValidator.equals(
    "owner role member id matches community owner id",
    ownerRole!.member.id,
    community.owner.id,
  );
  TestValidator.equals(
    "owner role member username matches",
    ownerRole!.member.username,
    member.username,
  );
}
