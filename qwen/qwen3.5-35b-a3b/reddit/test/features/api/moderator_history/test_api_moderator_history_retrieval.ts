import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_moderator_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminResult);
  // 2. Authenticate admin
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: adminResult.email,
      password: adminResult.token.access,
    },
  });
  // 3. Create test community as admin
  const testCommunity =
    await api.functional.redditPlatform.member.communities.create(
      adminAuthConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(testCommunity);
  // 4. Create test member to be appointed as moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberResult);
  // 5. Appoint member as moderator (creates history record)
  const moderatorAppointment =
    await api.functional.redditPlatform.member.communities.moderators.add(
      adminAuthConnection,
      {
        communityId: testCommunity.id,
        body: {
          user_id: memberResult.id,
        },
      },
    );
  typia.assert(moderatorAppointment);
  // 6. Retrieve the history record
  const historyRecord = await api.functional.redditPlatform.admin.histories.at(
    adminAuthConnection,
    {
      historyId: moderatorAppointment.id,
    },
  );
  typia.assert(historyRecord);
  // 7. Validate response structure and data
  TestValidator.equals(
    "history id matches appointment",
    historyRecord.id,
    moderatorAppointment.id,
  );
  TestValidator.equals(
    "community id matches",
    historyRecord.community.id,
    testCommunity.id,
  );
  TestValidator.equals(
    "community name matches",
    historyRecord.community.name,
    testCommunity.name,
  );
  TestValidator.equals(
    "action type is APPOINTED",
    historyRecord.actionType,
    "APPOINTED",
  );
  TestValidator.equals(
    "user id matches",
    historyRecord.user.id,
    memberResult.id,
  );
  TestValidator.equals(
    "user username matches",
    historyRecord.user.username,
    memberResult.username,
  );
  TestValidator.predicate(
    "acted by is not null",
    historyRecord.actedBy !== null,
  );
  TestValidator.predicate(
    "created_at is valid string",
    typeof historyRecord.createdAt === "string",
  );
  TestValidator.predicate(
    "updated_at is valid string",
    typeof historyRecord.updatedAt === "string",
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    historyRecord.deletedAt,
    null,
  );
}
