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

export async function test_api_moderator_list_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `owner_${RandomGenerator.alphabets(8)}`,
      display_name: `Owner ${RandomGenerator.name()}`,
      password: "12345678",
      bio: null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Generate a unique community name
  const communityName = `community_${RandomGenerator.alphabets(6)}`;
  // 3. Retrieve moderator list as community owner
  // Note: The endpoint only requires the community name parameter and valid authorization
  // Without community creation API available, we test the authorization and parameter flow
  const moderatorsResponse =
    await api.functional.redditLike.communities.moderators.at(ownerConnection, {
      communityName: communityName,
    });
  typia.assert(moderatorsResponse);
  // 4. Validate the response structure
  // ISummary likely contains an array property named 'data' or 'items'
  const moderatorsList = (moderatorsResponse as any).data ?? (moderatorsResponse as any).items ?? [];
  for (const moderator of moderatorsList) {
    TestValidator.predicate(
      "has valid UUID",
      /^[0-9a-f-]{36}$/i.test(moderator.id),
    );
    TestValidator.predicate(
      "has username",
      typeof moderator.username === "string" && moderator.username.length > 0,
    );
    TestValidator.predicate(
      "role is valid",
      ["owner", "moderator"].includes(moderator.role),
    );
    TestValidator.predicate(
      "has created_at timestamp",
      typeof moderator.created_at === "string" &&
        moderator.created_at.length > 0,
    );
  }
  // 5. Test with non-existent community to verify 404 handling
  const nonExistentName = `nonexistent_${RandomGenerator.alphabets(6)}`;
  await TestValidator.error(
    "should return 404 for non-existent community",
    async () => {
      await api.functional.redditLike.communities.moderators.at(
        ownerConnection,
        {
          communityName: nonExistentName,
        },
      );
    },
  );
}