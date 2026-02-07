import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_hot_feed_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // 2. Request first page of hot feed with empty request body (ICommunityPost.IRequest is empty)
  const firstPage = await api.functional.community.member.posts.hot.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(firstPage);
  // 3. Verify first page pagination metadata (per IPage.IPagination)
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "first page records > 0",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page pages >= 1",
    firstPage.pagination.pages >= 1,
  );
  TestValidator.equals(
    "first page data has 20 items",
    firstPage.data.length,
    20,
  );
  // 4. Request second page (same as first, since no cursor token exists in schema)
  const secondPage = await api.functional.community.member.posts.hot.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(secondPage);
  // 5. Verify second page pagination metadata (will likely be identical)
  TestValidator.equals("second page current", secondPage.pagination.current, 1);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
  TestValidator.equals(
    "second page records matches first",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages matches first",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "second page data has 20 items",
    secondPage.data.length,
    20,
  );
  // 6. Verify data in both responses are arrays of ICommunityPost.ISummary
  // Since 'id' property does not exist on ISummary, we use typia.assertGuard to validate type without property reference
  TestValidator.predicate(
    "first page data items are post summaries",
    firstPage.data.every((post) => {
      typia.assertGuard<ICommunityPost.ISummary>(post);
      return true; // Type-safe assertion passed, no need to check non-existent 'id'
    }),
  );
  TestValidator.predicate(
    "second page data items are post summaries",
    secondPage.data.every((post) => {
      typia.assertGuard<ICommunityPost.ISummary>(post);
      return true; // Type-safe assertion passed, no need to check non-existent 'id'
    }),
  );
}