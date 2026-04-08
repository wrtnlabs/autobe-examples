import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function test_api_reddit_platform_community_name_collision(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create first community with unique name
  const communityName = "test_community_" + RandomGenerator.alphaNumeric(6);
  const firstCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: "First test community for name collision testing",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // 3. Verify first community creation succeeded
  TestValidator.equals(
    "first community created",
    firstCommunity.name,
    communityName,
  );
  TestValidator.predicate(
    "has valid id",
    firstCommunity.id !== undefined && firstCommunity.id !== null,
  );
  TestValidator.equals(
    "owner is authenticated member",
    firstCommunity.owner.id,
    memberAuth.id,
  );
  // 4. Attempt to create second community with same name (should fail with 409 Conflict)
  await TestValidator.httpError(
    "duplicate community name should fail with 409 Conflict",
    409,
    async () => {
      await api.functional.redditPlatform.member.communities.create(
        memberConnection,
        {
          body: {
            name: communityName,
            description: "Attempted duplicate community",
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );
  // 5. Verify first community remains unchanged and accessible
  TestValidator.equals(
    "first community name unchanged after collision attempt",
    firstCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "first community owner unchanged after collision attempt",
    firstCommunity.owner.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "first community has valid description",
    firstCommunity.description !== undefined &&
      firstCommunity.description !== null &&
      firstCommunity.description.includes("First test community"),
  );
}
