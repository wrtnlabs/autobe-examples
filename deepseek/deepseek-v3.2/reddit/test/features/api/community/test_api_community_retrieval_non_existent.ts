import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
 * Test retrieval of a non-existent community returns 404 Not Found.
 *
 * 1. Create a member connection using join authentication
 * 2. Generate a random UUID that doesn't correspond to any existing community
 * 3. Attempt to retrieve the community using the non-existent UUID
 * 4. Validate that the API returns a 404 status with appropriate error
 */
export async function test_api_community_retrieval_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate random UUID that doesn't exist
  const nonExistentCommunityId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  // 3. Attempt to retrieve non-existent community
  await TestValidator.httpError(
    "Retrieving non-existent community should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.communities.at(memberConnection, {
        communityId: nonExistentCommunityId,
      });
    },
  );
}
