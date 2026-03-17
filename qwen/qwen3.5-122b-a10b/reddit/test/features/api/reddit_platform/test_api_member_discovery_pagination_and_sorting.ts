import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_discovery_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple test members with varying karma scores and timestamps
  const members: IRedditPlatformMember.IAuthorized[] = [];
  // Create 5 members for pagination testing
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: `member${i}@test.com` as string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">,
        password: "Password123!",
        username: `user${i + 100}` as string &
          tags.MinLength<1> &
          tags.MaxLength<50>,
        href: "https://test.com/join" as string & tags.Format<"uri">,
        referrer: "https://test.com" as string & tags.Format<"uri">,
        ip: "127.0.0.1" as string & tags.Format<"ipv4">,
      },
    });
    typia.assert(member);
    members.push(member);
  }
  // Test basic pagination - get page 1 with limit 2
  const page1Connection: api.IConnection = { host: connection.host };
  const page1Result = await api.functional.redditPlatform.members.index(
    page1Connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(page1Result);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 records >= 5",
    page1Result.pagination.records >= 5,
  );
  TestValidator.predicate(
    "page 1 pages calculated correctly",
    page1Result.pagination.pages >= 3,
  );
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);
  // Test pagination - get page 2 with limit 2
  const page2Result = await api.functional.redditPlatform.members.index(
    page1Connection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 2);
  // Test sorting by created_at descending (newest first)
  const sortByCreatedAtResult =
    await api.functional.redditPlatform.members.index(page1Connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    });
  typia.assert(sortByCreatedAtResult);
  // Verify created_at is in descending order
  for (let i = 1; i < sortByCreatedAtResult.data.length; i++) {
    TestValidator.predicate(
      `created_at[${i}] <= created_at[${i - 1}]`,
      sortByCreatedAtResult.data[i].created_at <=
        sortByCreatedAtResult.data[i - 1].created_at,
    );
  }
  // Test sorting by karma_score descending (highest first)
  const sortByKarmaResult = await api.functional.redditPlatform.members.index(
    page1Connection,
    {
      body: {
        sort_by: "karma_score",
        sort_order: "desc",
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(sortByKarmaResult);
  // Verify karma_score is in descending order
  for (let i = 1; i < sortByKarmaResult.data.length; i++) {
    TestValidator.predicate(
      `karma_score[${i}] <= karma_score[${i - 1}]`,
      sortByKarmaResult.data[i].karma_score <=
        sortByKarmaResult.data[i - 1].karma_score,
    );
  }
  // Test sorting by username ascending (alphabetical)
  const sortByUsernameResult =
    await api.functional.redditPlatform.members.index(page1Connection, {
      body: {
        sort_by: "username",
        sort_order: "asc",
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    });
  typia.assert(sortByUsernameResult);
  // Verify username is in ascending order
  for (let i = 1; i < sortByUsernameResult.data.length; i++) {
    TestValidator.predicate(
      `username[${i}] >= username[${i - 1}]`,
      sortByUsernameResult.data[i].username >=
        sortByUsernameResult.data[i - 1].username,
    );
  }
  // Test pagination with different page sizes
  const largePageResult = await api.functional.redditPlatform.members.index(
    page1Connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(largePageResult);
  TestValidator.equals(
    "large page limit",
    largePageResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large page data length matches records",
    largePageResult.data.length === largePageResult.pagination.records,
  );
}
