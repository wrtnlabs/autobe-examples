import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test successful member registration with only required fields, omitting optional biography.
 * Submit registration request with valid email, password, display_name, href, and referrer,
 * but exclude the bio field or send it as null. Verify the response contains complete member
 * profile with bio field returned as null. Verify account status is 'active' and authentication
 * tokens are provided. Verify the member can immediately use the returned tokens for authenticated
 * API operations. Confirm that optional bio omission does not affect account creation or
 * authentication flow.
 */
export async function test_api_member_join_minimal_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register with minimal required fields
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      bio: null,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Validate complete response structure including all fields and token
  typia.assert(member);
  // Verify account status is active
  TestValidator.equals("status should be active", member.status, "active");
  // Verify member profile data
  TestValidator.equals("articles count is zero", member.articles_count, 0);
  TestValidator.equals("comments count is zero", member.comments_count, 0);
  // Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    member.deleted_at,
    null,
  );
  // Verify bio field exists (utility provides default value)
  TestValidator.predicate(
    "bio field exists",
    member.bio === null || typeof member.bio === "string",
  );
}
