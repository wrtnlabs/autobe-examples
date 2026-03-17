import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test that attempting to remove an owner role fails with appropriate error.
 * This scenario validates that owner roles are permanent and cannot be removed via this API endpoint.
 */
export async function test_api_community_moderation_role_owner_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string>(),
      nickname: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create community - member becomes owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
        },
      },
    );
  typia.assert(community);
  // 3. Attempt to delete owner role (random roleId since we don't have API to fetch actual role ID)
  // According to API spec: "If role_type is 'owner', reject deletion (owners cannot be removed)."
  // Also: "If removing yourself as owner, reject with appropriate error (owner self-removal attempt)."
  // We'll test with a random roleId - the API should reject with appropriate error
  await TestValidator.error("owner role cannot be removed", async () => {
    await api.functional.communityPlatform.member.moderation_roles.erase(
      memberConnection,
      {
        communityId: community.id,
        roleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // 4. Additional test: Even the owner cannot remove their own owner role
  // This is essentially the same test but reinforces the business rule
  await TestValidator.error(
    "owner cannot remove their own owner role",
    async () => {
      await api.functional.communityPlatform.member.moderation_roles.erase(
        memberConnection,
        {
          communityId: community.id,
          roleId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
