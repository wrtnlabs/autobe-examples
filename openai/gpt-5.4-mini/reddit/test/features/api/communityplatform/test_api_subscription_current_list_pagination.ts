import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_current_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const limit = 5;
  const page = 1;
  const output =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page,
          limit,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page should match request",
    output.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    output.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data should not exceed requested limit",
    output.data.length <= limit,
  );
  for (const subscription of output.data) {
    typia.assert(subscription);
    TestValidator.predicate(
      "subscription should reference a community identity",
      subscription.community.id.length > 0 &&
        subscription.community.name.length > 0,
    );
    TestValidator.predicate(
      "subscription should be active or current",
      subscription.subscriptionStatus.length > 0,
    );
    TestValidator.predicate(
      "subscription should include created timestamp",
      subscription.createdAt.length > 0,
    );
    TestValidator.predicate(
      "subscription should include updated timestamp",
      subscription.updatedAt.length > 0,
    );
  }
}
