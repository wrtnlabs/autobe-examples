import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving post list for a member who has not created any posts.
 *
 * This test validates that when a member has no posts, the API returns
 * an empty list with correct pagination metadata (records: 0, pages: 0)
 * rather than an error. The member exists but has no content.
 */
export async function test_api_member_posts_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member account (do not create any posts)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Call the endpoint with the newly created member's ID
  const response = await api.functional.community.members.posts.index(
    connection,
    {
      memberId: member.id,
      body: {
        limit: 25,
        page: 1,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("page limit", response.pagination.limit, 25);
  TestValidator.equals("total records", response.pagination.records, 0);
  TestValidator.equals("total pages", response.pagination.pages, 0);
  // Verify response data array is empty
  TestValidator.equals("data array length", response.data.length, 0);
}
