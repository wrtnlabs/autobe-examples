import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";
import { prepare_random_reddit_clone_user_karma } from "../../../prepare/prepare_random_reddit_clone_user_karma";

export async function test_api_ban_moderator_cannot_ban_another_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `owner_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Register first moderator
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_member_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `mod1_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator1);
  // 4. Appoint first moderator
  const appointment1 =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { memberUsername: moderator1.username },
      },
    );
  typia.assert(appointment1);
  // 5. Register second moderator
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_member_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `mod2_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator2);
  // 6. Appoint second moderator
  const appointment2 =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { memberUsername: moderator2.username },
      },
    );
  typia.assert(appointment2);
  // 7. Verify moderator1 cannot ban moderator2 (should return 403 Forbidden)
  await TestValidator.httpError(
    "moderator cannot ban another moderator",
    403,
    async () =>
      await api.functional.redditClone.member.communities.bans.create(
        moderator1Connection,
        {
          communityName: community.name,
          body: {
            bannedUsername: moderator2.username,
            reason: "Abuse of powers",
          } satisfies IRedditCloneUserKarma.ICreate,
        },
      ),
  );
}
