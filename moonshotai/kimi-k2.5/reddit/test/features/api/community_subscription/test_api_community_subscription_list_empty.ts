import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_subscription_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a new member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Test Execution: Call PATCH /redditLike/member/subscriptions with default pagination
  const emptySubscriptions =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {}, // Default pagination parameters
      },
    );
  typia.assert(emptySubscriptions);
  // Validation: Check empty state requirements
  TestValidator.equals(
    "pagination current page",
    emptySubscriptions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    emptySubscriptions.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records",
    emptySubscriptions.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages",
    emptySubscriptions.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array is empty",
    emptySubscriptions.data.length,
    0,
  );
}
