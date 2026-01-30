import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunitySubscription";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_subscribed_communities_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Use member-specific connection to retrieve subscribed communities
  const subscriptionResponse: IPageICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.member.users.subscriptions.get(
      memberConnection,
    );
  typia.assert(subscriptionResponse);
  // Step 3: Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    subscriptionResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    subscriptionResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    subscriptionResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    subscriptionResponse.pagination.pages >= 0,
  );
  // Step 4: Validate data structure and ownership
  TestValidator.predicate(
    "data array exists",
    Array.isArray(subscriptionResponse.data),
  );
  // Step 5: Validate that all returned subscriptions belong to the authenticated member
  for (const subscription of subscriptionResponse.data) {
    TestValidator.equals(
      "member_id matches authenticated member",
      subscription.member_id,
      member.id,
    );
  }
  // Step 6: Test empty subscription scenario
  const anotherConnection: api.IConnection = { host: connection.host };
  const anotherMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(anotherConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(anotherMember);
  const emptySubscriptions: IPageICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.member.users.subscriptions.get(
      anotherConnection,
    );
  typia.assert(emptySubscriptions);
  TestValidator.equals(
    "empty subscription list size",
    emptySubscriptions.data.length,
    0,
  );
}
