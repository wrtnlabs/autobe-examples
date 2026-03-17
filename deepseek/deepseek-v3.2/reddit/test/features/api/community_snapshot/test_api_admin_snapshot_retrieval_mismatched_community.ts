import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_snapshots_create } from "../../../generate/generate_random_community_platform_admin_snapshots_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_snapshot } from "../../../prepare/prepare_random_community_platform_community_snapshot";

/**
 * Test that admin cannot retrieve a snapshot that belongs to a different community (snapshotId mismatch).
 * This scenario validates community-snapshot relationship enforcement.
 * 1. Create and authenticate admin user
 * 2. Create and authenticate member user
 * 3. Create two communities as member
 * 4. Create snapshot for community A as admin
 * 5. Attempt to retrieve the snapshot from community A using community B's ID in the path
 * 6. Verify proper error handling (404) for cross-community snapshot access
 */
export async function test_api_admin_snapshot_retrieval_mismatched_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create and authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphabets(10),
      nickname: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 3. Create two communities as member
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-a-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-b-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(communityB);
  // 4. Create snapshot for community A as admin
  const snapshot =
    await generate_random_community_platform_admin_snapshots_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphabets(10),
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          type: "public",
          status: "active",
          visibility: "public",
          is_nsfw: false,
          is_archived: false,
          is_locked: false,
          member_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          subscriber_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          post_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          comment_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          owner_member_id: memberAuthorized.id,
        },
        params: {
          communityId: communityA.id,
        },
      },
    );
  typia.assert(snapshot);
  // 5. Attempt to retrieve snapshot from community A using community B's ID
  // This should fail with 404
  await TestValidator.httpError(
    "retrieving snapshot with wrong community ID should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communities.snapshots.at(
        adminConnection,
        {
          communityId: communityB.id,
          snapshotId: snapshot.id,
        },
      );
    },
  );
}
