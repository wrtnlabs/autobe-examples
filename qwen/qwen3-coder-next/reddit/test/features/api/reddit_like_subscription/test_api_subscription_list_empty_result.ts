import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Call subscription list endpoint with empty body (should use defaults)
  const result = await api.functional.redditLike.member.subscriptions.index(
    memberConnection,
    {
      body: {} satisfies IRedditLikeSubscription.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate empty subscription list structure
  TestValidator.equals(
    "pagination.current should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 20",
    result.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination.records should be 0 (no subscriptions)",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0 (no records)",
    result.pagination.pages,
    0,
  );
  TestValidator.equals("data array should be empty", result.data.length, 0);
}
