import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create_ban } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create_ban";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_moderator_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator and owner actors
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneModerator.IJoin;
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderatorAuth);
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: ownerJoinInput,
  });
  typia.assert(ownerAuth);
  // 2. Login as owner and create community
  const ownerLoginInput = {
    email: ownerJoinInput.email,
    href: "https://example.com/owner" satisfies string & tags.Format<"uri">,
    password: ownerJoinInput.password,
    referrer: "https://example.com/referrer" satisfies string &
      tags.Format<"uri">,
  } satisfies IRedditCloneOwner.ILogin;
  const ownerLogin = await authorize_owner_login(ownerConnection, {
    body: ownerLoginInput,
  });
  typia.assert(ownerLogin);
  const community = await generate_random_reddit_clone_owner_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Login as moderator
  const moderatorLoginInput = {
    email: moderatorJoinInput.email,
    password: moderatorJoinInput.password,
  } satisfies IRedditCloneModerator.ILogin;
  const moderatorLogin = await authorize_moderator_login(moderatorConnection, {
    body: moderatorLoginInput,
  });
  typia.assert(moderatorLogin);
  // 4. Create ban record
  const bannedMemberId = typia.random<string & tags.Format<"uuid">>();
  const banInput = {
    member_id: bannedMemberId,
    reason: "Violated community guidelines",
  } satisfies IRedditCloneBanRecord.ICreate;
  const banRecord =
    await generate_random_reddit_clone_moderator_communities_bans_create_ban(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: banInput,
      },
    );
  typia.assert(banRecord);
  TestValidator.equals("ban record created", banRecord.is_active, true);
  // 5. Unban user
  await api.functional.redditClone.moderator.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      userId: bannedMemberId,
    },
  );
  // 6. Verify unban - check ban record no longer exists (404 expected)
  await TestValidator.httpError("ban record deleted", 404, async () => {
    await api.functional.redditClone.moderator.communities.bans.createBan(
      moderatorConnection,
      {
        communityId: community.id,
        body: banInput,
      },
    );
  });
}
