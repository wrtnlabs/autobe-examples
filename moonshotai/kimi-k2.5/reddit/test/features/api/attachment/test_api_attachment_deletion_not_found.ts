import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verify that attempting to delete a non-existent attachment returns HTTP 404 Not Found.
 * This tests the edge case where an attachment ID does not exist in the system.
 */
export async function test_api_attachment_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as a member using the join endpoint
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // Step 2: Generate a random UUID that doesn't correspond to any existing attachment
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3 & 4: Attempt to delete the non-existent attachment and verify 404 response
  await TestValidator.httpError(
    "non-existent attachment returns 404",
    404,
    async () => {
      await api.functional.redditLike.member.attachments.erase(
        memberConnection,
        {
          attachmentId: nonExistentAttachmentId,
        },
      );
    },
  );
}
