import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_list_by_assigned_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for setting up test data
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_moderator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Create a community (if available in API - using mock if not)
  const communityName = RandomGenerator.alphabets(8);
  // Note: community creation not available in provided API - using mock community
  // In real scenario, would create community via available API endpoint
  // For this test, we'll proceed with the assigned moderator functionality
  // Assign a moderator to the community
  const moderatorResult = await authorize_moderator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Create connection for the assigned moderator
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${moderatorResult.token.access}`,
    },
  };
  // Get moderator list for the community
  const moderator = await api.functional.redditLike.communities.moderators.at(
    moderatorConnection,
    {
      communityName: communityName,
    },
  );
  typia.assert(moderator);
  // Validate single moderator response structure
  TestValidator.equals(
    "has correct moderator field structure",
    Object.keys(moderator).sort(),
    ["id", "username", "role", "created_at"].sort(),
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(moderator.id),
  );
  TestValidator.predicate(
    "has valid role",
    ["owner", "moderator"].includes(moderator.role),
  );
}
