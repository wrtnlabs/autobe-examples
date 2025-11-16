import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusHistory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityStatusHistory";

export async function test_api_admin_community_status_history_search_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join) which authenticates connection as memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the authenticated memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communitySlug: string = community.slug;

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Minimal request body for history search
  const baseHistoryRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformCommunityStatusHistory.IRequest;

  // 4. Unauthenticated call must fail
  await TestValidator.error(
    "unauthenticated access to admin history search must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.statusHistories.index(
        unauthenticatedConnection,
        {
          communitySlug,
          body: baseHistoryRequest,
        },
      );
    },
  );

  // 5. Authenticated as memberUser (current connection), call must also fail
  await TestValidator.error(
    "memberUser access to admin history search must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.statusHistories.index(
        connection,
        {
          communitySlug,
          body: baseHistoryRequest,
        },
      );
    },
  );

  // 6. Register an adminUser using admin join (this overwrites Authorization header)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. Admin-authenticated call must succeed
  const adminHistoryRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformCommunityStatusHistory.IRequest;

  const historyPage: IPageICommunityPlatformCommunityStatusHistory.ISummary =
    await api.functional.communityPlatform.adminUser.communities.statusHistories.index(
      connection,
      {
        communitySlug,
        body: adminHistoryRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityStatusHistory.ISummary>(
    historyPage,
  );

  const pagination: IPage.IPagination = historyPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  TestValidator.predicate(
    "history data length is consistent with pagination limit (soft check)",
    historyPage.data.length <= pagination.limit,
  );
}
