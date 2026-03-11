import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Create community with authenticated connection (authConnection.headers already updated)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      authConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(5).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Validate subscriber count is 0
  TestValidator.equals("subscriber count is 0", community.subscriberCount, 0);
  // 4. Validate community name is non-empty
  TestValidator.predicate(
    "community name is non-empty",
    community.name.length > 0,
  );
  // 5. Validate description is valid (string or null)
  TestValidator.predicate(
    "description is valid",
    community.description === null || typeof community.description === "string",
  );
  // 6. Validate icon URL is valid (string or null)
  TestValidator.predicate(
    "icon URL is valid",
    community.iconUrl === null ||
      (typeof community.iconUrl === "string" &&
        community.iconUrl.includes(".")),
  );
  // 7. Validate createdAt is valid ISO date format
  TestValidator.predicate(
    "createdAt is valid ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      community.createdAt,
    ),
  );
  // 8. Validate updatedAt is valid ISO date format
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      community.updatedAt,
    ),
  );
  // 9. Validate deletedAt is null (active community)
  TestValidator.equals("deletedAt is null", community.deletedAt, null);
  // 10. Validate owner field contains member profile summary
  typia.assert(community.owner);
  TestValidator.predicate(
    "owner username is non-empty",
    community.owner.username.length > 0,
  );
  TestValidator.predicate(
    "owner display_name is non-empty",
    community.owner.display_name.length > 0,
  );
  TestValidator.predicate(
    "owner karma score is integer",
    typeof community.owner.karma_score === "number",
  );
  TestValidator.equals("owner is active", community.owner.is_active, true);
  TestValidator.predicate(
    "owner created_at is valid ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      community.owner.created_at,
    ),
  );
}