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

export async function test_api_profile_posts_list_empty_for_member_with_no_posts(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member with no posts using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Call the posts listing endpoint with the member's profile id
  // Note: The join response provides member.id (community_members.id).
  // The userProfileId (community_user_profiles.id) is not directly exposed,
  // but we use member.id as it is the only UUID available from the join response.
  const result = await api.functional.community.userProfiles.posts.index(
    memberConnection,
    {
      userProfileId: member.id,
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(result);
  // Step 3: Validate empty data array
  TestValidator.equals("data array should be empty", result.data, []);
  // Step 4: Validate pagination metadata for zero records
  TestValidator.equals(
    "pagination.records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination.current should be 1",
    result.pagination.current,
    1,
  );
}
