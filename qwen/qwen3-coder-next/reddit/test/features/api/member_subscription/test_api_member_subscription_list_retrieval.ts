import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscription_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new member using utility function
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Step 2: Create another connection with authentication token
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(authConnection, {
    body: {
      email: authorizedMember.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCloneMember.ILogin,
  });
  // Step 3: Call the subscription list endpoint with default pagination
  const subscriptionRequest = {
    search: undefined,
    name: undefined,
    subscriptionStatus: "subscribed" as const,
    sort: "popularity",
    page: 1,
    limit: 20,
  } satisfies IRedditCloneCommunity.IRequest;
  const result = await api.functional.redditClone.member.subscriptions.index(
    authConnection,
    {
      body: subscriptionRequest,
    },
  );
  // Step 4: Validate response structure and type
  typia.assert(result);
  // Step 5: Validate pagination metadata
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate(
    "current page is valid",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is valid",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages count is valid", result.pagination.pages >= 0);
  // Step 6: Validate community summary structure
  for (const community of result.data) {
    TestValidator.predicate(
      "community has valid id",
      /^[0-9a-f-]{36}$/i.test(community.id),
    );
    TestValidator.predicate(
      "community has name",
      typeof community.name === "string" && community.name.length > 0,
    );
    TestValidator.predicate(
      "community has subscriber count",
      typeof community.subscriberCount === "number",
    );
    TestValidator.predicate(
      "community has valid created at",
      typeof community.createdAt === "string" && community.createdAt.length > 0,
    );
    TestValidator.predicate(
      "community has owner",
      community.owner !== undefined,
    );
    if (community.owner) {
      TestValidator.predicate(
        "owner has valid id",
        /^[0-9a-f-]{36}$/i.test(community.owner.id),
      );
      TestValidator.predicate(
        "owner has username",
        typeof community.owner.username === "string" &&
          community.owner.username.length > 0,
      );
    }
  }
}
