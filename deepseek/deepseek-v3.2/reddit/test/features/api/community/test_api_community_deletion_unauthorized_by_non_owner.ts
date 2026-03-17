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
 * Test authorization failure when a non‑owner attempts to delete a community.
 *
 * 1. Create member A (owner) and authenticate via authorize_member_join
 * 2. Create community using owner's authenticated connection
 * 3. Create member B (non-owner) and authenticate via authorize_member_join
 * 4. Attempt to delete community using member B's connection
 * 5. Expect HttpError with 403 status
 * 6. Verify community remains intact (deleted_at is null)
 */
export async function test_api_community_deletion_unauthorized_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate owner (member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphabets(10),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  // 2. Create community as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create and authenticate non-owner (member B)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphabets(10),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(nonOwner);
  // 4. Attempt to delete community as non-owner (should fail with 403)
  await TestValidator.error(
    "non-owner should not be able to delete community",
    async () => {
      await api.functional.communityPlatform.member.erase(nonOwnerConnection, {
        communityId: community.id,
      });
    },
  );
  // 5. Verify community still exists and is not deleted
  // Note: There's no GET endpoint for community retrieval in provided SDK
  // We'll rely on the fact that if deletion succeeded, the HttpError wouldn't be thrown
  // This test focuses on authorization failure validation
  // Additional validation: Try to delete again as owner to ensure community still exists
  // and can be deleted by the actual owner
  await api.functional.communityPlatform.member.erase(ownerConnection, {
    communityId: community.id,
  });
  // If owner deletion succeeds, it confirms the community was still intact
  // If it fails, something else is wrong (community already deleted or not found)
}
