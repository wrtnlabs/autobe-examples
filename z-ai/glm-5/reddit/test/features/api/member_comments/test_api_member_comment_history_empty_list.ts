import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a member's comment history when they have not written any comments.
 *
 * This test validates that:
 * 1. Members without comment activity return empty data array
 * 2. Pagination structure is still returned even with zero records
 * 3. No error is thrown for members with no comment history
 * 4. The endpoint handles the empty state gracefully
 */
export async function test_api_member_comment_history_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with no comment activity
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Retrieve the member's comment history
  const commentHistory =
    await api.functional.communityPlatform.members.comments.search(connection, {
      memberId: authorized.id,
    });
  typia.assert(commentHistory);
  // 3. Verify the response returns empty data array
  TestValidator.equals("data array is empty", commentHistory.data, []);
  // 4. Verify pagination metadata for empty state
  TestValidator.equals(
    "records count is zero",
    commentHistory.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is zero",
    commentHistory.pagination.pages,
    0,
  );
}
