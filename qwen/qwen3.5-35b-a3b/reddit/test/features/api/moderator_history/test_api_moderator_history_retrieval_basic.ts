import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModeratorHistory";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_moderator_history_retrieval_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Member setup - register and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create community (member becomes owner)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member (owner) adds themselves as moderator (creates APPOINTED history)
  await api.functional.redditPlatform.member.communities.moderators.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        user_id: memberAuth.user.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 5. Admin removes member as moderator (creates REMOVED history)
  await api.functional.redditPlatform.member.communities.moderators.eraseByCommunityidAndModeratorid(
    adminConnection,
    {
      communityId: community.id,
      moderatorId: memberAuth.user.id,
    },
  );
  // 6. Retrieve moderator history
  const response =
    await api.functional.redditPlatform.admin.communities.moderator_histories.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IRedditPlatformModeratorHistory.IRequest,
      },
    );
  typia.assert(response);
  // 7. Validate response structure
  TestValidator.equals(
    "pagination has current page",
    response.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    response.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    response.pagination.records >= 2,
    true,
  );
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pagination calculates pages correctly",
    response.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "data array has records",
    response.data.length >= 2,
    true,
  );
  // 8. Validate history records
  const appointedRecord = response.data.find(
    (r) => r.action_type === "APPOINTED",
  );
  const removedRecord = response.data.find((r) => r.action_type === "REMOVED");
  TestValidator.equals(
    "appointed record exists",
    appointedRecord !== undefined,
    true,
  );
  TestValidator.equals(
    "removed record exists",
    removedRecord !== undefined,
    true,
  );
  TestValidator.equals(
    "appointed record has community",
    appointedRecord!.community_id === community.id,
    true,
  );
  TestValidator.equals(
    "removed record has community",
    removedRecord!.community_id === community.id,
    true,
  );
  TestValidator.equals(
    "appointed record has user",
    appointedRecord!.user_id === memberAuth.user.id,
    true,
  );
  TestValidator.equals(
    "removed record has user",
    removedRecord!.user_id === memberAuth.user.id,
    true,
  );
  TestValidator.equals(
    "appointed record has community name",
    appointedRecord!.community.name,
    community.name,
  );
  TestValidator.equals(
    "removed record has community name",
    removedRecord!.community.name,
    community.name,
  );
  TestValidator.equals(
    "appointed record has moderator username",
    appointedRecord!.user.username,
    memberAuth.user.username,
  );
  TestValidator.equals(
    "removed record has moderator username",
    removedRecord!.user.username,
    memberAuth.user.username,
  );
  TestValidator.equals(
    "appointed record has timestamp",
    appointedRecord!.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "removed record has timestamp",
    removedRecord!.created_at !== undefined,
    true,
  );
}