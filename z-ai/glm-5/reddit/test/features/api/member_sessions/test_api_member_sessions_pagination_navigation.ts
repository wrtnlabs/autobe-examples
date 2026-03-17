import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Get first page with small limit to force pagination
  const page1 = await api.functional.communityPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies ICommunityPlatformMemberSession.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 2", page1.pagination.limit, 2);
  TestValidator.predicate(
    "total records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate("data length respects limit", page1.data.length <= 2);
  // 4. If there are multiple pages, test pagination navigation
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          limit: 2,
          page: 2,
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    // Verify no duplicate sessions across pages
    const page1Ids = new Set(page1.data.map((s) => s.id));
    const page2Ids = new Set(page2.data.map((s) => s.id));
    const hasDuplicates = page2.data.some((s) => page1Ids.has(s.id));
    TestValidator.predicate(
      "no duplicate sessions across pages",
      !hasDuplicates,
    );
    // Verify sort order (created_at descending)
    if (page1.data.length >= 2) {
      TestValidator.predicate(
        "page 1 sorted descending",
        new Date(page1.data[0].created_at).getTime() >=
          new Date(page1.data[1].created_at).getTime(),
      );
    }
    if (page2.data.length >= 2) {
      TestValidator.predicate(
        "page 2 sorted descending",
        new Date(page2.data[0].created_at).getTime() >=
          new Date(page2.data[1].created_at).getTime(),
      );
    }
    if (page1.data.length > 0 && page2.data.length > 0) {
      TestValidator.predicate(
        "cross-page sort order",
        new Date(page1.data[page1.data.length - 1].created_at).getTime() >=
          new Date(page2.data[0].created_at).getTime(),
      );
    }
  }
  // 5. Test boundary: request page beyond available pages
  const beyondPage =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          limit: 2,
          page: 9999,
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page has empty data", beyondPage.data.length, 0);
  // 6. Test limit boundary: minimum (1)
  const minLimitPage =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals(
    "limit 1 is respected",
    minLimitPage.pagination.limit,
    1,
  );
  TestValidator.predicate("data length <= 1", minLimitPage.data.length <= 1);
  // 7. Test limit boundary: maximum (100)
  const maxLimitPage =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "limit 100 is respected",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length <= 100",
    maxLimitPage.data.length <= 100,
  );
  // 8. Verify total records consistency across different pagination settings
  TestValidator.equals(
    "total records consistent across pagination",
    page1.pagination.records,
    minLimitPage.pagination.records,
  );
  TestValidator.equals(
    "total records consistent with max limit",
    page1.pagination.records,
    maxLimitPage.pagination.records,
  );
}
