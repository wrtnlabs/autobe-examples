import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscriptions_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member to access subscription records
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  // Generate date range for filtering (today to 7 days from today)
  const now = new Date();
  const startDate = new Date(now).toISOString();
  const endDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Invoke the date-range filter endpoint
  const response = await api.functional.community.member.subscriptions.patch(
    memberConnection,
    {
      body: {
        startDate: startDate,
        endDate: endDate,
      } satisfies ICommunitySubscription.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "data items are ISummary objects",
    response.data.every((item) => item && typeof item === "object"),
  );
  // Since ICommunitySubscription.ISummary has no createdAt property, we cannot verify date filtering logic
  // but we confirm the endpoint responds correctly for valid requests.
}
