import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test authorization boundary: users without moderator privileges cannot access reports.
 */
export async function test_api_reports_authorization_non_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account who will be community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community where first member becomes owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create second member account without moderation privileges
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {});
  typia.assert(nonModerator);
  // 4. First verify that owner CAN access reports for their community
  const ownerReports =
    await api.functional.communityPlatform.member.reports.index(
      ownerConnection,
      {
        body: {
          community_id: community.id,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(ownerReports);
  // Owner should have access (no error thrown)
  // 5. Attempt to access reports endpoint as non-moderator - should fail
  await TestValidator.error(
    "non-moderator should not access reports",
    async () => {
      await api.functional.communityPlatform.member.reports.index(
        nonModeratorConnection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformContentReport.IRequest,
        },
      );
    },
  );
  // 6. Also test that non-moderator cannot access reports without community_id filter
  await TestValidator.error(
    "non-moderator should not access any reports",
    async () => {
      await api.functional.communityPlatform.member.reports.index(
        nonModeratorConnection,
        {
          body: {
            limit: 10,
            page: 1,
          } satisfies ICommunityPlatformContentReport.IRequest,
        },
      );
    },
  );
}
