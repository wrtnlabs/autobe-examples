import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscriptions_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (who will have 0 subscriptions)
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredMember: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>()
      } satisfies IRedditPlatformMember.IJoin
    });
  typia.assert(registeredMember);
  // 2. Create authenticated connection using registration tokens
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {}
  };
  memberConnection.headers!.Authorization = registeredMember.token.access;
  // 3. Query subscriptions immediately (before any subscriptions created)
  const subscriptionsResponse =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20
        } satisfies IRedditPlatformCommunitySubscription.IRequest
      },
    );
  typia.assert(subscriptionsResponse);
  // 4. Validate empty state
  TestValidator.equals(
    "subscription records should be 0",
    subscriptionsResponse.pagination.records,
    0
  );
  TestValidator.equals(
    "pagination pages should be 0 for empty list",
    subscriptionsResponse.pagination.pages,
    0
  );
  TestValidator.equals(
    "subscription data array should be empty",
    subscriptionsResponse.data.length,
    0
  );
  TestValidator.equals(
    "pagination current should be 1",
    subscriptionsResponse.pagination.current,
    1
  );
  TestValidator.equals(
    "pagination limit should be 20",
    subscriptionsResponse.pagination.limit,
    20
  );
}