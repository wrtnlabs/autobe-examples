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

export async function test_api_ban_owner_bans_member_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member with specific username
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerSession = await api.functional.redditClone.auth.member.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: "community_owner_test",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMemberSession.IJoin,
    },
  );
  typia.assert(ownerSession);
  // 2. Create community as owner
  const community = await api.functional.redditClone.member.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Register banned member with specific username
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserSession = await api.functional.redditClone.auth.member.join(
    bannedUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: "banned_user_test",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMemberSession.IJoin,
    },
  );
  typia.assert(bannedUserSession);
  // 4. Owner bans the member with reason
  const banReason = "Violation of community rules - spam behavior";
  const ban = await api.functional.redditClone.member.communities.bans.create(
    ownerConnection,
    {
      communityName: community.name,
      body: {
        bannedUsername: "banned_user_test",
        reason: banReason,
      } satisfies IRedditCloneUserKarma.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Validate ban record
  TestValidator.equals("reason matches", ban.reason, banReason);
  TestValidator.equals("community id matches", ban.community.id, community.id);
  TestValidator.equals(
    "banned user username matches",
    ban.bannedUser.username,
    "banned_user_test",
  );
  TestValidator.equals(
    "issuer username matches",
    ban.issuer.username,
    "community_owner_test",
  );
  TestValidator.equals("deleted_at is null", ban.deleted_at, null);
  TestValidator.equals("expires_at is null", ban.expires_at, null);
}
