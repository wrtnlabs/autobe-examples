import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_subscription_current_membership_lookup(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.update(
      memberConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(subscription);
  const lookup =
    await api.functional.communityPlatform.member.communities.subscriptions.at(
      memberConnection,
      {
        communityId: subscription.community.id,
      },
    );
  typia.assert(lookup);
  TestValidator.equals(
    "subscription id should match",
    lookup.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription member should match",
    lookup.member,
    subscription.member,
  );
  TestValidator.equals(
    "subscription community should match",
    lookup.community,
    subscription.community,
  );
  TestValidator.equals(
    "subscription status should match",
    lookup.subscriptionStatus,
    subscription.subscription_status,
  );
  TestValidator.equals(
    "createdAt should match",
    lookup.createdAt,
    subscription.created_at,
  );
  TestValidator.equals(
    "updatedAt should match",
    lookup.updatedAt,
    subscription.updated_at,
  );
  TestValidator.equals(
    "deletedAt should match",
    lookup.deletedAt,
    subscription.deleted_at,
  );
}
