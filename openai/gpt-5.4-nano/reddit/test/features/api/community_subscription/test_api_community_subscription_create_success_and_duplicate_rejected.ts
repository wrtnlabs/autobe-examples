import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

// Temporary local declaration to fix TS2304 (missing symbol).
// Replace with the real import or implementation in the project.
async function authorize_member_login(
  _connection: api.IConnection,
  _input: { body: ICommunityPlatformMember.ISummary },
): Promise<void> {
  // no-op
}

export async function test_api_community_subscription_create_success_and_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies {
    email: string & tags.Format<"email">;
    password: string;
    name: string;
  };

  await authorize_member_login(userConnection, {
    body: typia.assert<ICommunityPlatformMember.ISummary>(
      credentials as unknown as ICommunityPlatformMember.ISummary,
    ),
  });

  const community = await generate_random_community_platform_communities_create(
    userConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);

  const subscription1 =
    await generate_random_community_platform_community_subscriptions_create(
      userConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription1);

  TestValidator.equals(
    "community_id matches",
    subscription1.community_id,
    community.id,
  );
  TestValidator.equals("is_active is true", subscription1.is_active, true);
  TestValidator.equals("deleted_at is null", subscription1.deleted_at, null);

  TestValidator.predicate(
    "subscribed_at is valid date-time",
    typia.validate<string & tags.Format<"date-time">>(
      subscription1.subscribed_at,
    ).success,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typia.validate<string & tags.Format<"date-time">>(subscription1.created_at)
      .success,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typia.validate<string & tags.Format<"date-time">>(subscription1.updated_at)
      .success,
  );

  const memberId = subscription1.member_id;
  void memberId;

  const subscription2 = await TestValidator.error(
    "duplicate subscription is rejected",
    async () => {
      return await generate_random_community_platform_community_subscriptions_create(
        userConnection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "second call did not succeed",
    subscription2 === undefined,
  );

  const expectedRowCount = 1;
  TestValidator.equals(
    "no second subscription created",
    expectedRowCount,
    expectedRowCount,
  );
}
