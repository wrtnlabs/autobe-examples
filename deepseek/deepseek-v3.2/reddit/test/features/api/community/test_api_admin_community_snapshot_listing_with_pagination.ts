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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test that an admin can successfully retrieve paginated historical snapshots for a community.
 */
export async function test_api_admin_community_snapshot_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Member authentication using utility function to create community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create community using member connection and utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Wait briefly for potential snapshot creation
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 5. Call admin snapshot listing endpoint with pagination
  const snapshots =
    await api.functional.communityPlatform.admin.snapshots.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
          ascending: false,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate pagination structure
  TestValidator.equals("pagination metadata structure", snapshots.pagination, {
    current: 1,
    limit: 10,
    records: snapshots.pagination.records,
    pages: snapshots.pagination.pages,
  });
  TestValidator.predicate(
    "current page is 1",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", snapshots.pagination.limit === 10);
  TestValidator.predicate(
    "records count non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 7. Validate snapshot data structure when snapshots exist
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    typia.assert(snapshot);
    // Validate essential snapshot fields
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has code",
      typeof snapshot.code === "string",
    );
    TestValidator.predicate(
      "snapshot has name",
      typeof snapshot.name === "string",
    );
    TestValidator.predicate(
      "snapshot has type",
      typeof snapshot.type === "string",
    );
    TestValidator.predicate(
      "snapshot has status",
      typeof snapshot.status === "string",
    );
    TestValidator.predicate(
      "snapshot has visibility",
      typeof snapshot.visibility === "string",
    );
    TestValidator.predicate(
      "snapshot has NSFW flag",
      typeof snapshot.is_nsfw === "boolean",
    );
    TestValidator.predicate(
      "snapshot has archived flag",
      typeof snapshot.is_archived === "boolean",
    );
    TestValidator.predicate(
      "snapshot has locked flag",
      typeof snapshot.is_locked === "boolean",
    );
    TestValidator.predicate(
      "snapshot has member count",
      typeof snapshot.member_count === "number",
    );
    TestValidator.predicate(
      "snapshot has subscriber count",
      typeof snapshot.subscriber_count === "number",
    );
    TestValidator.predicate(
      "snapshot has post count",
      typeof snapshot.post_count === "number",
    );
    TestValidator.predicate(
      "snapshot has comment count",
      typeof snapshot.comment_count === "number",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
    );
    // Validate owner information matches community creator
    typia.assert(snapshot.owner_member);
    TestValidator.equals(
      "owner id matches community creator",
      snapshot.owner_member.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "owner email matches",
      snapshot.owner_member.email,
      memberAuth.email,
    );
    TestValidator.equals(
      "owner username matches",
      snapshot.owner_member.username,
      memberAuth.username,
    );
  }
}
