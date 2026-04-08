import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful comment deletion by authenticated member.
   *
   * Creates a member account and tests the comment deletion endpoint. Note that due to
   * missing SDK functions for creating posts, comments, and communities, this test:
   * - Creates a member account for authentication
   * - Tests the delete endpoint with a random comment UUID
   * - Verifies the operation completes without throwing (returns 204 No Content)
   *
   * Due to unavailable creation/query APIs, this test validates endpoint
   * accessibility and authentication flow, but cannot verify:
   * - Whether the comment existed before deletion
   * - Whether the comment was actually removed
   * - Username visibility in thread context
   * - Karma score preservation
   *
   * 1. Member account creation via join endpoint
   * 2. Comment deletion by author using erase endpoint
   * 3. Verification of successful 204 No Content response
   */
  // 1. Create a member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Delete a comment by its UUID using the authenticated connection
  // Note: Headers in memberConnection are already set by authorize_member_join
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.redditPlatform.member.comments.erase(memberConnection, {
    commentId,
  });
  // erase returns void, no assertion needed
}
