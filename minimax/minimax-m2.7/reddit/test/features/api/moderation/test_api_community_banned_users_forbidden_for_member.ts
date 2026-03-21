import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserKarma";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

/**
 * Test that a regular community member (non-moderator) receives 403 Forbidden
 * when attempting to view the banned users list.
 *
 * Setup steps:
 * 1. Register owner via POST /auth/member/join
 * 2. Register regular member via POST /auth/member/join
 * 3. Create community owned by first member
 * 4. Subscribe regular member to the community
 * 5. Attempt to query bans as regular member via PATCH /member/communities/{communityName}/bans
 *
 * Expected results:
 * - Response status 403 Forbidden
 * - Response indicates lack of authorization to view ban records
 * - No ban data is exposed to unauthorized users
 * - This validates that only moderators and owners can access moderation tools
 */
export async function test_api_community_banned_users_forbidden_for_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Register regular member (non-moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Create community owned by owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Subscribe regular member to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 5. Attempt to query bans as regular member (should get 403 Forbidden)
  await TestValidator.httpError(
    "regular member cannot view banned users list",
    403,
    async () =>
      await api.functional.redditClone.member.communities.bans.index(
        memberConnection,
        {
          communityName: community.name,
          body: {
            page: 1,
            limit: 20,
            status: "active",
          },
        },
      ),
  );
}
