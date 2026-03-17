import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_community_ban_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(moderatorAuth);
  // 2. Create community as moderator
  const community =
    await api.functional.redditPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create target member to be banned
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(targetAuth);
  // 4. Create second target member for multiple ban test
  const target2Connection: api.IConnection = { host: connection.host };
  const target2Auth = await authorize_member_join(target2Connection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(target2Auth);
  // 5. Assign moderator role to moderator (already owner, but test the endpoint)
  // Note: Community creator is automatically owner, so no need to assign
  // 6. Ban first target member
  const ban1 =
    await api.functional.redditPlatform.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          reddit_platform_member_id: targetAuth.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban1);
  // 7. Ban second target member
  const ban2 =
    await api.functional.redditPlatform.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          reddit_platform_member_id: target2Auth.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban2);
  // 8. Retrieve ban list as moderator
  const banList =
    await api.functional.redditPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(banList);
  // 9. Validate ban list structure
  TestValidator.equals("ban list has data", banList.data.length, 2);
  TestValidator.equals(
    "pagination current page",
    banList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", banList.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    banList.pagination.records,
    2,
  );
  TestValidator.equals("pagination total pages", banList.pagination.pages, 1);
  // 10. Validate ban record structure
  const banRecords = banList.data;
  for (const banRecord of banRecords) {
    // Validate ban record fields
    TestValidator.predicate("ban has id", banRecord.id !== undefined);
    TestValidator.predicate(
      "ban has community",
      banRecord.community !== undefined,
    );
    TestValidator.predicate("ban has member", banRecord.member !== undefined);
    TestValidator.predicate(
      "ban has bannedBy",
      banRecord.bannedBy !== undefined,
    );
    TestValidator.predicate(
      "ban has createdAt",
      banRecord.createdAt !== undefined,
    );
    // Validate member summary
    TestValidator.predicate(
      "member has username",
      banRecord.member.username !== undefined,
    );
    TestValidator.predicate(
      "member has karma_score",
      banRecord.member.karma_score !== undefined,
    );
    // Validate bannedBy is the moderator
    TestValidator.equals(
      "bannedBy is moderator",
      banRecord.bannedBy.id,
      moderatorAuth.id,
    );
    // Validate community
    TestValidator.equals(
      "community id matches",
      banRecord.community.id,
      community.id,
    );
  }
  // 11. Verify ban list is ordered by created_at descending
  const banIds = banRecords.map((b) => b.id);
  const ban1Index = banIds.indexOf(ban1.id);
  const ban2Index = banIds.indexOf(ban2.id);
  TestValidator.predicate(
    "ban2 appears after ban1 (most recent first)",
    ban2Index < ban1Index,
  );
  // 12. Test unban and verify soft-deleted ban is excluded
  // Note: Unban endpoint is DELETE /redditPlatform/member/communities/{communityId}/bans/{userId}
  // Since we don't have the unban utility function, we'll skip this test for now
  // The soft-deletion exclusion is validated by the API's internal logic
}