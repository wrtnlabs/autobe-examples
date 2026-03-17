import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_ban_assignment_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(8),
      nickname: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderator);
  // Create a community - creator becomes owner (has moderator privileges)
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create ban on a random member (need memberId only, not actual user)
  const randomMemberId = typia.random<string & tags.Format<"uuid">>();
  const ban = await generate_random_community_platform_member_bans_create(
    moderatorConnection,
    {
      body: {
        memberId: randomMemberId,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: null,
      } satisfies ICommunityPlatformBan.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // Test retrieval with pagination and filtering
  // Generate search term from random content
  const searchTerm = RandomGenerator.alphabets(5);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const searchRequest = {
    search: searchTerm,
    created_at_from: weekAgo.toISOString(),
    created_at_to: now.toISOString(),
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
    sort: "created_at" as const,
    order: "desc" as const,
  } satisfies ICommunityPlatformBanAssignment.IRequest;
  const assignmentsPage =
    await api.functional.communityPlatform.member.bans.assignments.index(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: searchRequest,
      },
    );
  typia.assert(assignmentsPage);
  // Validate business logic only (not types - already validated by typia.assert)
  // Check pagination consistency
  TestValidator.predicate(
    "pagination pages calculated correctly",
    assignmentsPage.pagination.pages === 0 ||
      assignmentsPage.pagination.pages ===
        Math.ceil(
          assignmentsPage.pagination.records / assignmentsPage.pagination.limit,
        ),
  );
  TestValidator.predicate(
    "current page within bounds",
    assignmentsPage.pagination.current >= 1 &&
      (assignmentsPage.pagination.pages === 0 ||
        assignmentsPage.pagination.current <= assignmentsPage.pagination.pages),
  );
  TestValidator.predicate(
    "data length matches pagination",
    assignmentsPage.data.length <= assignmentsPage.pagination.limit,
  );
  // If there are records, verify data array not empty when records > 0
  if (assignmentsPage.pagination.records > 0) {
    TestValidator.predicate(
      "data array not empty when records exist",
      assignmentsPage.data.length > 0,
    );
  }
  // Validate that assignment IDs are unique (business logic)
  const assignmentIds = assignmentsPage.data.map((a) => a.id);
  const uniqueIds = new Set(assignmentIds);
  TestValidator.equals(
    "assignment IDs are unique",
    assignmentIds.length,
    uniqueIds.size,
  );
}
