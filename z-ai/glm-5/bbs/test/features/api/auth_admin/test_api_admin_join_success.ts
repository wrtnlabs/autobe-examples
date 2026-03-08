import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the admin join operation
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate required fields for admin registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Register new admin with minimal required fields
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Validate response structure
  typia.assert(admin);
  // Verify email matches the submitted email
  TestValidator.equals(
    "email should match submitted email",
    admin.email,
    email,
  );
  // Verify new admins receive 'regular' grade by default
  TestValidator.equals(
    "grade should be 'regular' for new admin",
    admin.grade,
    "regular",
  );
  // Verify displayName defaults to email when not provided
  TestValidator.equals(
    "displayName should default to email",
    admin.displayName,
    email,
  );
  // Verify bio is null when omitted
  TestValidator.equals("bio should be null", admin.bio, null);
  // Verify bannedAt is null for new accounts
  TestValidator.equals("bannedAt should be null", admin.bannedAt, null);
  // Verify banReason is null for new accounts
  TestValidator.equals("banReason should be null", admin.banReason, null);
  // Verify deletedAt is null for new accounts
  TestValidator.equals("deletedAt should be null", admin.deletedAt, null);
  // Verify createdAt and updatedAt are valid ISO timestamps
  TestValidator.predicate("createdAt should be valid date-time", () => {
    const date = new Date(admin.createdAt);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updatedAt should be valid date-time", () => {
    const date = new Date(admin.updatedAt);
    return !isNaN(date.getTime());
  });
  // Verify token contains valid access and refresh tokens
  TestValidator.predicate("access token should be non-empty string", () => {
    return (
      typeof admin.token.access === "string" && admin.token.access.length > 0
    );
  });
  TestValidator.predicate("refresh token should be non-empty string", () => {
    return (
      typeof admin.token.refresh === "string" && admin.token.refresh.length > 0
    );
  });
  // Verify expiration timestamps are valid
  TestValidator.predicate("expired_at should be valid date-time", () => {
    const date = new Date(admin.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until should be valid date-time", () => {
    const date = new Date(admin.token.refreshable_until);
    return !isNaN(date.getTime());
  });
  // Verify expiration timestamps are in the future
  TestValidator.predicate("expired_at should be in the future", () => {
    return new Date(admin.token.expired_at) > new Date();
  });
  TestValidator.predicate("refreshable_until should be in the future", () => {
    return new Date(admin.token.refreshable_until) > new Date();
  });
  // Verify refreshable_until is later than expired_at (refresh token lives longer)
  TestValidator.predicate(
    "refreshable_until should be later than expired_at",
    () => {
      return (
        new Date(admin.token.refreshable_until) >
        new Date(admin.token.expired_at)
      );
    },
  );
}
