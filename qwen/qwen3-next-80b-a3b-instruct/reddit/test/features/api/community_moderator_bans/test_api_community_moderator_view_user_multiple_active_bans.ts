import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { generate_random_reddit_community_community_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_community_community_moderator_communities_bans_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";

export async function test_api_community_moderator_view_user_multiple_active_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Use the user associated with the moderator account as the target user
  const user = moderator.user;
  typia.assert(user);
  // Create 1050 active bans for the same user across different communities
  const banPromises: Promise<IRedditCommunityBan>[] = [];
  for (let i = 0; i < 1050; i++) {
    // Generate a random community for each ban
    const community = typia.random<IRedditCommunityCommunity.ISummary>();
    typia.assert(community);
    // Create ban in this community using SDK direct call
    const banPromise =
      api.functional.redditCommunity.communityModerator.communities.bans.create(
        moderatorConnection,
        {
          communityId: community.id,
          body: {
            user_id: user.id,
            expires_at: null,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditCommunityBan.ICreate,
        },
      );
    banPromises.push(banPromise);
  }
  // Wait for all bans to be created
  await Promise.all(banPromises);
  // 3. Call the endpoint to retrieve bans for this user
  const response: IPageIRedditCommunityBan.ISummary =
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorConnection,
      { userId: user.id },
    );
  typia.assert(response);
  // 4. Verify response structure and content
  TestValidator.equals(
    "pagination object has correct values",
    {
      current: response.pagination.current,
      records: response.pagination.records,
      pages: response.pagination.pages,
    },
    {
      current: 1,
      records: 1050,
      pages: 2,
    },
  );
  TestValidator.equals(
    "data array has 1000 entries on first page",
    response.data.length,
    1000,
  );
  // Verify all bans are active
  await TestValidator.predicate("all bans are active", () =>
    response.data.every((ban) => ban.is_active === true),
  );
  // Verify bans are ordered by creation date descending
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const next = new Date(response.data[i + 1].created_at).getTime();
    await TestValidator.predicate(
      "bans ordered by creation date descending",
      () => current >= next,
    );
  }
  // Verify each ban has required summary fields
  for (const ban of response.data) {
    TestValidator.equals("ban has valid ID", typeof ban.id, "string");
    TestValidator.equals("ban has active flag", ban.is_active, true);
    TestValidator.equals("ban has created_at", typeof ban.created_at, "string");
    TestValidator.equals("ban has updated_at", typeof ban.updated_at, "string");
    TestValidator.equals("ban has valid reason", typeof ban.reason, "string");
    TestValidator.equals("ban has expires_at as null", ban.expires_at, null);
    // We cannot verify user or community summary properties as they are declared as {} in IRedditCommunityBan.ISummary
    // and do not have typed properties in the DTO.
  }
}
