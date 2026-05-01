import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test community deletion with a non-existent community name, expecting 404 Not Found.
 *
 * Validates that the system correctly rejects deletion attempts for communities that do not exist on the platform. An authenticated member attempts to delete a community using a randomly generated name that does not correspond to any existing community.
 *
 * The system must authenticate the member first, then reject the deletion request with a 404 Not Found status, indicating the community was not found rather than any authorization issue.
 */
export async function test_api_community_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to delete a non-existent community — expect 404
  await TestValidator.httpError(
    "non-existent community deletion returns 404",
    404,
    async () =>
      await api.functional.communityHub.member.communities.erase(
        memberConnection,
        { communityName: typia.random<string>() },
      ),
  );
}
