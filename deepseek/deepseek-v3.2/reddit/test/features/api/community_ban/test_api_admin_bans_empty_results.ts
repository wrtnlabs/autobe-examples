import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
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
 * Test the admin ban list endpoint when no bans match the filter criteria.
 * Validates proper handling of empty result sets, pagination metadata for zero records,
 * and appropriate filtering that excludes all existing bans.
 */
export async function test_api_admin_bans_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup using connection isolation
  const adminConnection: api.IConnection = { host: connection.host };
  // Create and authenticate admin account using utility function
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCreds });
  // adminConnection now has authentication headers from join
  // 2. Create a member account to own the community (admin cannot create community with admin token)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCreds });
  // memberConnection now has authentication headers
  // Create community owned by the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Test 1: Filter by non-existent username (guaranteed no match)
  const emptyUsernameResult =
    await api.functional.communityPlatform.admin.bans.index(adminConnection, {
      communityId: community.id,
      body: {
        username: typia.random<string & tags.Format<"uuid">>(), // Random UUID as username - doesn't exist
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >() satisfies number as number,
        page: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >() satisfies number as number,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(emptyUsernameResult);
  TestValidator.equals(
    "empty username filter data array",
    emptyUsernameResult.data,
    [],
  );
  TestValidator.equals(
    "empty username filter records",
    emptyUsernameResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty username filter pages",
    emptyUsernameResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty username filter current page",
    emptyUsernameResult.pagination.current,
    1,
  );
}