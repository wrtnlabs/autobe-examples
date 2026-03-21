import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
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
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_user_karma } from "../../../prepare/prepare_random_reddit_clone_user_karma";

export async function test_api_ban_update_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create the community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  // 3. Create the member who will be banned
  const bannedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(bannedConnection, {});
  // 4. Create another member who will attempt unauthorized ban update
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedMember = await authorize_member_join(
    unauthorizedConnection,
    {},
  );
  // 5. Create ban as owner against the banned member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: (
          await authorize_member_login(bannedConnection, {
            body: {
              email: (
                await authorize_member_join({ host: connection.host }, {})
              ).email,
              password: "password",
              href: "",
              referrer: "",
            },
          })
        ).username,
        reason: "Test ban for unauthorized update test",
      },
    },
  );
  // Get the banned user's username from the ban response
  const bannedUsername = ban.bannedUser.username;
  // 6. Attempt to update the ban as the unauthorized member (should fail with 403)
  await TestValidator.httpError(
    "unauthorized member cannot update ban",
    403,
    async () =>
      await api.functional.redditClone.member.communities.bans.update(
        unauthorizedConnection,
        {
          communityName: community.name,
          banId: ban.id,
          body: {
            reason: "Attempting to change ban reason",
          } satisfies IRedditCloneUserKarma.IUpdate,
        },
      ),
  );
}