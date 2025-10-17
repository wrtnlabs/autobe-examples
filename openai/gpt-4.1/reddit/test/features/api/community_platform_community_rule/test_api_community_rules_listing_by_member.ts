import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";

/**
 * Validate authenticated member can list community rules with
 * pagination/filtering.
 *
 * 1. Register new member.
 * 2. Create a new community as the member.
 * 3. List rules for existing community with no filters. Result should be valid
 *    page structure.
 * 4. List rules with specific paging (limit, page) and confirm constraints are
 *    respected (example: limit=1).
 * 5. List rules with non-matching search filter, expect valid empty result page.
 * 6. Attempt to list rules for non-existent community, expect error.
 * 7. Attempt to list rules unauthenticated, expect error.
 */
export async function test_api_community_rules_listing_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals("Email matches input", member.email, memberEmail);
  TestValidator.predicate("Token is present", member.token.access.length > 0);

  // 2. Create a new community
  const slug = RandomGenerator.alphaNumeric(16);
  const createBody = {
    name: RandomGenerator.name(2),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: createBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "Community creator matches member",
    community.creator_member_id,
    member.id,
  );
  TestValidator.equals("Community slug matches input", community.slug, slug);

  // 3. List rules for that community with no paging/filtering (default)
  const rulesPage: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.member.communities.rules.index(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(rulesPage);
  TestValidator.equals(
    "Rules page contains reference to right community",
    rulesPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "Rules page references community's rule list",
    rulesPage.data.length === 0 ||
      rulesPage.data.every((rule) => rule.community_id === community.id),
    true,
  );

  // 4. List rules with pagination/limit option
  const limit = 1;
  const rulesPageLimited =
    await api.functional.communityPlatform.member.communities.rules.index(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          limit,
          page: 1,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(rulesPageLimited);
  TestValidator.predicate(
    "Rules pagination respects limit",
    rulesPageLimited.pagination.limit === limit ||
      rulesPageLimited.data.length <= limit,
  );

  // 5. List with impossible search filter (should return 0 result but valid page)
  const impossibleSearch = RandomGenerator.alphaNumeric(32);
  const rulesPageNoMatch =
    await api.functional.communityPlatform.member.communities.rules.index(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          search: impossibleSearch,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(rulesPageNoMatch);
  TestValidator.equals(
    "Rules empty when no matching filter",
    rulesPageNoMatch.data.length,
    0,
  );
  TestValidator.equals(
    "Rules page is still valid with 0 results",
    rulesPageNoMatch.pagination.current,
    1,
  );

  // 6. Error: Non-existent community
  await TestValidator.error("Error when community does not exist", async () => {
    await api.functional.communityPlatform.member.communities.rules.index(
      connection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  });

  // 7. Error: Unauthenticated access (simulate unauthenticated by creating fresh connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Cannot list rules while unauthenticated",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.index(
        unauthConn,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformCommunityRule.IRequest,
        },
      );
    },
  );
}
