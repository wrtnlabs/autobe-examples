import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via authorize_member_join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Retrieve subscription with random UUID
  // Since there's no API to create a subscription, we use a random UUID
  // This test validates the endpoint can be called by authenticated member
  // and returns a valid schema response
  const subscription = await api.functional.community.member.subscriptions.at(
    memberConnection,
    {
      subscriptionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(subscription);
}
