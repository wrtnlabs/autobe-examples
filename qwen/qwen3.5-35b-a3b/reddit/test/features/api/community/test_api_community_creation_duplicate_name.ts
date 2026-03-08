import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create first community with unique name
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(communityConnection, {
    body: {
      email: member.email,
      password: "1234",
    },
  });
  const communityName = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const firstCommunity =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // 3. Verify first community was created successfully
  TestValidator.equals(
    "first community name matches",
    firstCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "first community has correct owner",
    firstCommunity.owner.id,
    member.id,
  );
  TestValidator.equals(
    "first community subscriber count is 0",
    firstCommunity.subscriber_count,
    0,
  );
  // 4. Attempt to create second community with same name (should fail with 409)
  await TestValidator.httpError(
    "duplicate community name returns 409 Conflict",
    [409],
    async () => {
      await api.functional.redditPlatform.member.communities.create(
        communityConnection,
        {
          body: {
            name: communityName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );
  // 5. Verify original community remains intact
  TestValidator.equals(
    "original community name unchanged after duplicate attempt",
    firstCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "original community owner unchanged",
    firstCommunity.owner.id,
    member.id,
  );
  TestValidator.equals(
    "original community subscriber count unchanged",
    firstCommunity.subscriber_count,
    0,
  );
}
