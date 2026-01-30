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
export async function test_api_member_subscription_retrieval_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member using the utility function
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(memberAuth);
  // Use the authenticated connection to call the subscription endpoint
  // The API requires a body with communityIds array (minimum 1 item)
  // We pass a random UUID (unknown community) since we cannot create one
  // The endpoint is documented as retrieval so we expect to get the member's subscriptions
  // The member has just been created and has zero subscriptions
  const response =
    await api.functional.communityBbs.member.users.subscriptions.patchByUserid(
      memberConnection,
      {
        userId: memberAuth.id,
        body: {
          communityIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies ICommunityBbsCommunitySubscription.IRequest,
      },
    );
  typia.assert(response);
  // Validate the response is an empty list (zero subscriptions)
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  TestValidator.equals("data array length", response.data.length, 0);
  TestValidator.predicate(
    "response shows empty subscription list",
    response.data.length === 0,
  );
}
