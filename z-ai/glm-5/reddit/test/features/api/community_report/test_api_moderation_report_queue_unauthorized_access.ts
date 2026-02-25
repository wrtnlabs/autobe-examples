import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
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

/**
 * Test that a regular member (non-moderator) cannot access the report queue.
 *
 * This test validates authorization enforcement for the moderation report queue:
 * 1. Create a community with an owner (who becomes moderator automatically)
 * 2. Create a second member who is NOT a moderator of that community
 * 3. Attempt to access the report queue as the non-moderator member
 * 4. Verify that a 403 Forbidden error is returned
 *
 * This ensures privacy protection - regular members cannot see who reported
 * content or view moderation queues.
 */
export async function test_api_moderation_report_queue_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community (owner becomes the moderator automatically)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a regular member who is NOT a moderator
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 4. Attempt to access the report queue as non-moderator - should fail with 403
  await TestValidator.httpError(
    "non-moderator cannot access report queue",
    403,
    async () =>
      await api.functional.community.member.communities.reports.index(
        memberConnection,
        {
          communityName: community.name,
          body: {} satisfies ICommunityReport.IRequest,
        },
      ),
  );
}
