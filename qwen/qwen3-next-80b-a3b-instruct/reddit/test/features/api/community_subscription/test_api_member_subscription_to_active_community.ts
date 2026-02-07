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
import { generate_random_community_member_subscriptions_create } from "../../../generate/generate_random_community_member_subscriptions_create";
import { prepare_random_community_subscription } from "../../../prepare/prepare_random_community_subscription";

export async function test_api_member_subscription_to_active_community(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
  } satisfies ICommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // Subscribe member to active community
  // ICommunitySubscription is an empty object type with no defined properties
  // The system creates a subscription record with generated ID and timestamp,
  // but these are not defined in the DTO, so we cannot validate them
  const subscription =
    await generate_random_community_member_subscriptions_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(subscription);
}
