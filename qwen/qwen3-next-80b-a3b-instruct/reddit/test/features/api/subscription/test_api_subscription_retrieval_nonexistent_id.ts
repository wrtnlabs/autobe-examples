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

export async function test_api_subscription_retrieval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Attempt to retrieve a non-existent subscription using a randomly generated UUID
  // The system must return 404 Not Found as documented in the scenario
  // We don't expect a valid subscription record, so we test the 404 response
  await TestValidator.httpError(
    "non-existent subscription returns 404",
    404,
    async () => {
      await api.functional.community.member.subscriptions.at(memberConnection, {
        subscriptionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
