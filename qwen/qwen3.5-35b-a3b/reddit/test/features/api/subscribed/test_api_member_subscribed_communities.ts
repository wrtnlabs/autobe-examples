import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Create authenticated member connection
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Request subscribed communities with pagination
  const requestBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    sort_by: "subscribed_at" as const,
    sort_order: "desc" as const,
  } satisfies IRedditPlatformSubscription.IRequest;
  const response = await api.functional.redditPlatform.member.subscribed.index(
    authenticatedConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "pagination has valid records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation",
    response.pagination.pages >= 0,
  );
  // 5. Validate subscription data structure
  if (response.data.length > 0) {
    const subscription = response.data[0];
    typia.assert(subscription);
    // Validate subscription fields
    TestValidator.equals(
      "subscription id is valid UUID",
      subscription.id.length,
      36,
    );
    TestValidator.equals(
      "subscription deleted_at is null",
      subscription.deleted_at,
      null,
    );
    TestValidator.notEquals(
      "subscription has community",
      subscription.community,
      null,
    );
    // Validate community details
    const community = subscription.community;
    typia.assert(community);
    TestValidator.equals("community has UUID id", community.id.length, 36);
    TestValidator.predicate("community has name", community.name.length > 0);
    TestValidator.equals(
      "community has subscriber_count",
      typeof community.subscriber_count,
      "number",
    );
    TestValidator.notEquals("community has owner", community.owner, null);
  }
  // 6. Verify pagination metadata accuracy
  typia.assert(response.pagination);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
}