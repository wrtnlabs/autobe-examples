import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
 * Test deletion of a non-existent post returns 404 Not Found.
 *
 * Validates that attempting to delete a post that does not exist
 * in the system returns a 404 error, as per business rules.
 */
export async function test_api_post_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Test Case 1: Attempt to delete a non-existent post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent post deletion returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.erase(
        memberConnection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
