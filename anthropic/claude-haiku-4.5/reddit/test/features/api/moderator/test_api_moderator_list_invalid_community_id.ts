import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

export async function test_api_moderator_list_invalid_community_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member to make authenticated requests
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Test with non-existent UUID
  // Generate a valid UUID format that doesn't correspond to any existing community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return error when querying moderators for non-existent community",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.index(
        connection,
        {
          communityId: nonExistentCommunityId,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommunityModerator.IRequest,
        },
      );
    },
  );
}
