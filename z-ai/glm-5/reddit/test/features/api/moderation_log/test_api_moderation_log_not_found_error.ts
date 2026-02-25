import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerationLog";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_moderation_log_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that requesting a non-existent moderation log entry returns a 404 error.
   * This scenario validates proper error handling when a log ID does not exist
   * or does not belong to the specified community.
   */
  // 1. Register member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community with member A (owner becomes moderator automatically)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Attempt to retrieve a moderation log with a non-existent UUID as logId
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify that the API returns a 404 error for non-existent log
  await TestValidator.httpError(
    "non-existent moderation log should return 404",
    404,
    async () => {
      await api.functional.community.member.communities.moderationLogs.at(
        ownerConnection,
        {
          communityName: community.name,
          logId: nonExistentLogId,
        },
      );
    },
  );
}
