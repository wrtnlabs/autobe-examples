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

export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system and receives initial JWT tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Validate initial response contains all required fields
  TestValidator.equals("member id exists", joinResult.id !== undefined, true);
  TestValidator.equals("email exists", joinResult.email !== undefined, true);
  TestValidator.equals(
    "display_name exists",
    joinResult.display_name !== undefined,
    true,
  );
  TestValidator.equals("ban_status is active", joinResult.ban_status, "active");
  TestValidator.equals(
    "access_token exists",
    joinResult.access_token !== undefined,
    true,
  );
  TestValidator.equals(
    "refresh_token exists",
    joinResult.refresh_token !== undefined,
    true,
  );
  TestValidator.equals("token_type is Bearer", joinResult.token_type, "Bearer");
  TestValidator.equals("expires_in is 3600", joinResult.expires_in, 3600);
  // 3. Create refresh connection and use refresh token to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.refresh_token,
    } satisfies IDiscussionBoardMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate refresh response contains complete member profile
  TestValidator.equals("member id preserved", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "email preserved",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "display_name preserved",
    refreshResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "ban_status is active",
    refreshResult.ban_status,
    "active",
  );
  TestValidator.equals(
    "access_token exists",
    refreshResult.access_token !== undefined,
    true,
  );
  TestValidator.equals(
    "refresh_token exists",
    refreshResult.refresh_token !== undefined,
    true,
  );
  TestValidator.equals(
    "token_type is Bearer",
    refreshResult.token_type,
    "Bearer",
  );
  TestValidator.equals("expires_in is 3600", refreshResult.expires_in, 3600);
  // 5. Validate token rotation - new refresh token should be different from original
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.refresh_token,
    joinResult.refresh_token,
  );
  // 6. Validate token expiration timestamps
  TestValidator.predicate(
    "access token expired_at is in future",
    new Date(refreshResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is in future",
    new Date(refreshResult.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(refreshResult.token.refreshable_until) >
      new Date(refreshResult.token.expired_at),
  );
  // 7. Validate member profile contains all required fields
  TestValidator.predicate(
    "has article_count",
    typeof refreshResult.article_count === "number",
  );
  TestValidator.predicate(
    "has comment_count",
    typeof refreshResult.comment_count === "number",
  );
  TestValidator.predicate("has created_at", refreshResult.created_at !== null);
  TestValidator.predicate("has updated_at", refreshResult.updated_at !== null);
}
