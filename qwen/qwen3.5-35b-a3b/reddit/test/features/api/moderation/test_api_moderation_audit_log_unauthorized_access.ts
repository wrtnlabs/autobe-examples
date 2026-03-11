import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_ban } from "../../../generate/generate_random_reddit_platform_member_communities_bans_ban";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_moderation_audit_log_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create community using member A's connection
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
        },
      },
    );
  typia.assert(community);
  // 3. Create member B (to be made moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberBAuth);
  // 4. Add member B as moderator of community
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      memberAConnection,
      {
        communityId: community.id,
        userId: memberBAuth.user.id,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create member C (to be banned)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberCAuth);
  // 6. Ban member C using member B's moderator connection
  // This action generates an audit log entry internally
  await generate_random_reddit_platform_member_communities_bans_ban(
    memberBConnection,
    {
      params: {
        communityId: community.id,
        userId: memberCAuth.user.id,
      },
      body: {},
    },
  );
  // 7. Create member D (non-moderator attempting access)
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberDAuth = await authorize_member_join(memberDConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberDAuth);
  // 8. Try to access audit log using member D's connection
  // This should fail with 403 Forbidden since member D is not a moderator
  // Use a valid UUID format to test authorization check
  await TestValidator.httpError(
    "non-moderator cannot access audit log",
    403,
    async () => {
      await api.functional.redditPlatform.member.communities.moderation_audit_logs.at(
        memberDConnection,
        {
          communityId: community.id,
          logId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 9. Test variation: non-moderator trying to access another community's audit logs
  const memberEConnection: api.IConnection = { host: connection.host };
  const memberEAuth = await authorize_member_join(memberEConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberEAuth);
  await TestValidator.httpError(
    "non-moderator cannot access another community's audit log",
    403,
    async () => {
      await api.functional.redditPlatform.member.communities.moderation_audit_logs.at(
        memberEConnection,
        {
          communityId: community.id,
          logId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
