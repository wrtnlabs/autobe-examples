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

export async function test_api_member_subscriptions_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Establish member authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // Retrieve member subscriptions with default pagination (limit=20, cursor=0)
  const subscriptions =
    await api.functional.community.member.subscriptions.patch(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(subscriptions);
  // Validate pagination metadata structure exists
  TestValidator.equals(
    "pagination is object",
    typeof subscriptions.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current",
    typeof subscriptions.pagination.current === "number" &&
      subscriptions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof subscriptions.pagination.limit === "number" &&
      subscriptions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    typeof subscriptions.pagination.records === "number" &&
      subscriptions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof subscriptions.pagination.pages === "number" &&
      subscriptions.pagination.pages >= 0,
  );
  // Validate that data is an array of ICommunitySubscription.ISummary objects
  TestValidator.predicate("data is array", Array.isArray(subscriptions.data));
  TestValidator.equals(
    "data length matches records count",
    subscriptions.data.length,
    subscriptions.pagination.records,
  );
  // Validate each item in data is an object (since ICommunitySubscription.ISummary is empty, we can't validate specific properties)
  for (const subscription of subscriptions.data) {
    TestValidator.predicate(
      "subscription is object",
      typeof subscription === "object" && subscription !== null,
    );
  }
}
