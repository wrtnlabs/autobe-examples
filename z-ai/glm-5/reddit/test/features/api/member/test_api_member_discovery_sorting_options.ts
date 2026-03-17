import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_discovery_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple members with different usernames for sorting tests
  const members = await ArrayUtil.asyncRepeat(10, async (index) => {
    const conn: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(conn, {
      body: {
        username: `user_${String.fromCharCode(97 + index)}_${RandomGenerator.alphaNumeric(4)}`,
      },
    });
    return member;
  });
  // Wait a bit to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Test sortBy='karma' with sortDirection='desc'
  const karmaDesc = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        sortBy: "karma",
        sortDirection: "desc",
        limit: 100,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(karmaDesc);
  for (let i = 1; i < karmaDesc.data.length; i++) {
    TestValidator.predicate(
      "karma descending order",
      karmaDesc.data[i - 1].karma >= karmaDesc.data[i].karma,
    );
  }
  // 4. Test sortBy='karma' with sortDirection='asc'
  const karmaAsc = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        sortBy: "karma",
        sortDirection: "asc",
        limit: 100,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(karmaAsc);
  for (let i = 1; i < karmaAsc.data.length; i++) {
    TestValidator.predicate(
      "karma ascending order",
      karmaAsc.data[i - 1].karma <= karmaAsc.data[i].karma,
    );
  }
  // 5. Test sortBy='created_at' with sortDirection='desc'
  const createdDesc = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        sortBy: "created_at",
        sortDirection: "desc",
        limit: 100,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(createdDesc);
  for (let i = 1; i < createdDesc.data.length; i++) {
    const prevDate = new Date(createdDesc.data[i - 1].createdAt).getTime();
    const currDate = new Date(createdDesc.data[i].createdAt).getTime();
    TestValidator.predicate(
      "created_at descending order",
      prevDate >= currDate,
    );
  }
  // 6. Test sortBy='created_at' with sortDirection='asc'
  const createdAsc = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        sortBy: "created_at",
        sortDirection: "asc",
        limit: 100,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(createdAsc);
  for (let i = 1; i < createdAsc.data.length; i++) {
    const prevDate = new Date(createdAsc.data[i - 1].createdAt).getTime();
    const currDate = new Date(createdAsc.data[i].createdAt).getTime();
    TestValidator.predicate("created_at ascending order", prevDate <= currDate);
  }
  // 7. Test sortBy='username' with sortDirection='asc'
  const usernameAsc = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        sortBy: "username",
        sortDirection: "asc",
        limit: 100,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(usernameAsc);
  for (let i = 1; i < usernameAsc.data.length; i++) {
    TestValidator.predicate(
      "username ascending order",
      usernameAsc.data[i - 1].username.localeCompare(
        usernameAsc.data[i].username,
      ) <= 0,
    );
  }
  // 8. Test sortBy='username' with sortDirection='desc'
  const usernameDesc = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        sortBy: "username",
        sortDirection: "desc",
        limit: 100,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(usernameDesc);
  for (let i = 1; i < usernameDesc.data.length; i++) {
    TestValidator.predicate(
      "username descending order",
      usernameDesc.data[i - 1].username.localeCompare(
        usernameDesc.data[i].username,
      ) >= 0,
    );
  }
  // 9. Test cursor-based pagination
  const firstPage = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        sortBy: "created_at",
        sortDirection: "desc",
        limit: 5,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(firstPage);
  if (firstPage.data.length > 0) {
    const cursorTimestamp = firstPage.data[firstPage.data.length - 1].createdAt;
    const secondPage = await api.functional.communityPlatform.members.index(
      memberConnection,
      {
        body: {
          sortBy: "created_at",
          sortDirection: "desc",
          limit: 5,
          cursor: cursorTimestamp,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(secondPage);
    // Verify cursor pagination - members should be older than cursor
    for (const member of secondPage.data) {
      TestValidator.predicate(
        "cursor pagination - members before cursor",
        new Date(member.createdAt).getTime() <
          new Date(cursorTimestamp).getTime(),
      );
    }
  }
  // 10. Test limit parameter
  const limitedResult = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        limit: 3,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(limitedResult);
  TestValidator.predicate(
    "limit parameter respected",
    limitedResult.data.length <= 3,
  );
  TestValidator.equals(
    "limit in pagination",
    limitedResult.pagination.limit,
    3,
  );
  // 11. Test page parameter
  const page1 = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  const page2 = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  // Verify pages have different data
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and page 2 have different data",
      page1.data[0].id,
      page2.data[0].id,
    );
  }
  // 12. Verify pagination metadata
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit) ||
      (page1.pagination.records === 0 && page1.pagination.pages === 0),
  );
  // 13. Verify avatar field structure
  for (const member of page1.data) {
    if (member.avatar !== null) {
      typia.assert(member.avatar);
    }
  }
}
