import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that attempting to delete a non-existent community returns 404 Not Found.
 *
 * This validates the edge case where the communityId references a non-existent
 * or already soft-deleted community.
 *
 * Steps:
 * 1. Authenticate as a member using POST /redditClone/auth/member/join
 * 2. Attempt to delete a community with a UUID that doesn't exist in the system
 * 3. Validate the response is HTTP 404 Not Found
 */
export async function test_api_community_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete non-existent community and validate 404 response
  await TestValidator.httpError(
    "deleting non-existent community returns 404",
    404,
    async () =>
      await api.functional.redditClone.member.communities.erase(
        memberConnection,
        {
          communityId: nonExistentCommunityId,
        },
      ),
  );
}
