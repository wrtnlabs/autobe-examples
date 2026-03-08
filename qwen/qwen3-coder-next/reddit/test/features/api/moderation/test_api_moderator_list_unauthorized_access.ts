import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_list_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator (community owner)
  const moderatorData = await authorize_moderator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  // 2. Create community as moderator
  const communityName = "test_community_" + RandomGenerator.alphabets(6);
  // 3. Create and authenticate regular member
  const memberData = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 4. Member attempts to list moderators as unauthorized user
  // Should receive 403 Forbidden
  await TestValidator.error(
    "unauthorized member should receive 403 Forbidden",
    async () => {
      await api.functional.redditLike.communities.moderators.at(connection, {
        communityName,
      });
    },
  );
}
