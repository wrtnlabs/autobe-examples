import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_duplicate_active_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  TestValidator.predicate(
    "initial subscription is active",
    subscription.active,
  );
  TestValidator.equals(
    "initial subscription is not deleted",
    subscription.deleted_at,
    null,
  );
  TestValidator.predicate(
    "initial subscriber count is at least one",
    subscription.community.subscriber_count >= 1,
  );
  const duplicateBody = {
    community_slug: subscription.community.slug,
  } satisfies ICommunityPlatformSubscription.ICreate;
  TestValidator.equals(
    "duplicate request targets the same community",
    duplicateBody.community_slug,
    subscription.community.slug,
  );
  await TestValidator.error(
    "duplicate active subscription is rejected",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.create(
        memberConnection,
        {
          body: duplicateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original subscription remains linked to same community",
    subscription.community.slug,
    duplicateBody.community_slug,
  );
  TestValidator.predicate(
    "original subscription remains active in captured response",
    subscription.active,
  );
}
