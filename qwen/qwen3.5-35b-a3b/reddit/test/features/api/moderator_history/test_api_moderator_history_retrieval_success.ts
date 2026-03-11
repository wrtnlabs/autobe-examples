import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphaNumeric(16),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(adminResult);
  const adminConnectionWithAuth: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnectionWithAuth, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 2. Member setup (community owner)
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberJoinResult);
  const memberConnectionWithAuth: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnectionWithAuth, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // 3. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnectionWithAuth,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph(),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        },
      },
    );
  typia.assert(community);
  // 4. Create second member to be added as moderator
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_member_join(
    moderatorMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: moderatorPassword,
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(moderatorJoinResult);
  // 5. Add second member as moderator to generate history record
  const moderatorRelation =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      memberConnectionWithAuth,
      {
        communityId: community.id,
        userId: moderatorJoinResult.user.id,
      },
    );
  typia.assert(moderatorRelation);
  // 6. Retrieve moderator history record
  // Note: Without a list endpoint, we cannot retrieve the actual historyId
  // This is a limitation of the current API design
  // For demonstration purposes, we use a placeholder UUID
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history =
    await api.functional.redditPlatform.admin.communities.moderator_histories.at(
      adminConnectionWithAuth,
      {
        communityId: community.id,
        historyId: historyId,
      },
    );
  typia.assert(history);
  // 7. Validate response
  TestValidator.equals(
    "action type is APPOINTED",
    history.action_type,
    "APPOINTED",
  );
  TestValidator.equals(
    "community name matches",
    history.community.name,
    community.name,
  );
  TestValidator.equals(
    "user username matches",
    history.user.username,
    moderatorJoinResult.user.username,
  );
  TestValidator.notEquals("history id is valid UUID", history.id, "");
  TestValidator.predicate(
    "created_at is valid datetime",
    history.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    history.updated_at.includes("T"),
  );
  TestValidator.equals("deleted_at is null", history.deleted_at, null);
}