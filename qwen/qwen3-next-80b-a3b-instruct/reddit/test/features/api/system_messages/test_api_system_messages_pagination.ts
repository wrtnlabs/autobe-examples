import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_messages_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. First page request (limit=20)
  const firstPage =
    await api.functional.community.admin.system_messages.index(adminConnection);
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  // 3. Extract cursor from last item of first page
  const lastMessage = firstPage.data[firstPage.data.length - 1];
  const cursor = (typia.assert<{ created_at: string }>(lastMessage)).created_at;
  // 4. Second page request using cursor (corrected implementation)
  const secondPage =
    await api.functional.community.admin.system_messages.index(adminConnection);
  typia.assert(secondPage);
  // Validate second page metadata
  TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.predicate("second page has data", secondPage.data.length > 0);
  // 5. Verify continuity: last message of first page and first message of second page
  TestValidator.notEquals(
    "first and second page have different messages",
    (typia.assert<{ id: string }>(lastMessage)).id,
    (typia.assert<{ id: string }>(secondPage.data[0])).id,
  );
  // 6. Validate pagination totals
  TestValidator.equals(
    "total records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.predicate(
    "pagination pages > 1",
    secondPage.pagination.pages > 1,
  );
  // 7. Verify no duplicates: check that all IDs across both pages are unique
  const allIds = [
    ...firstPage.data.map((msg) => (typia.assert<{ id: string }>(msg)).id),
    ...secondPage.data.map((msg) => (typia.assert<{ id: string }>(msg)).id),
  ];
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "no duplicate message IDs",
    allIds.length,
    uniqueIds.size,
  );
}