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
 * Test successful member registration with full response validation.
 *
 * Registers a new member account through the join endpoint and verifies that the response conforms to the ICommunityHubMember.IAuthorized contract. typia.assert performs complete structural validation including UUID format for id, ISO 8601 date-time formats for created_at and token expiration fields, nullability constraints for bio and avatar_uri, and int32 type enforcement for karma.
 *
 * Beyond structural validation, the test verifies key business invariants that distinguish a newly registered member from an existing one: the display_name defaults to the submitted username during registration, bio and avatar_uri are null, karma is initialized to zero, and both posts and comments arrays are empty. JWT access and refresh tokens are confirmed to be non-empty strings.
 *
 * 1. Generate a known username and register via authorize_member_join utility.
 * 2. typia.assert validates the full response structure against ICommunityHubMember.IAuthorized.
 * 3. Verify username matches the submitted value.
 * 4. Verify display_name defaults to the submitted username.
 * 5. Confirm bio and avatar_uri are null for a new member.
 * 6. Confirm karma starts at 0.
 * 7. Confirm posts and comments arrays are empty.
 * 8. Confirm JWT access and refresh tokens are non-empty.
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  const username = RandomGenerator.name(1);
  const member = await authorize_member_join(connection, {
    body: { username },
  });
  typia.assert(member);
  TestValidator.equals("username matches submitted", member.username, username);
  TestValidator.equals(
    "display_name defaults to username",
    member.display_name,
    username,
  );
  TestValidator.equals("bio is null for new member", member.bio, null);
  TestValidator.equals(
    "avatar_uri is null for new member",
    member.avatar_uri,
    null,
  );
  TestValidator.equals("karma starts at 0", member.karma, 0);
  TestValidator.predicate("posts is empty", member.posts.length === 0);
  TestValidator.predicate("comments is empty", member.comments.length === 0);
  TestValidator.predicate(
    "token.access is non-empty string",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    member.token.refresh.length > 0,
  );
}
