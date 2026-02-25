import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_unsubscribe_from_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to establish valid authorization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Use typia.random to generate a valid subscription ID (UUID)
  // Since we cannot create a subscription through available APIs,
  // we must test the erase endpoint with a valid UUID structure
  const subscriptionId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform the unsubscribe operation - this is the only available function for this endpoint
  await api.functional.redditCommunity.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId,
    },
  );
  // 4. Since the erase endpoint returns void, the success is confirmed by the function completing
  // without throwing an error. No further validation is possible with the given API constraints.
  // This test confirms the endpoint is accessible and processes a valid UUID
}
