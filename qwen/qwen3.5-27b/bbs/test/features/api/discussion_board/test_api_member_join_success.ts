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
 * Test successful member registration on discussion board platform.
 *
 * This test verifies that a new member account can be created with
 * required fields only (email and password), and that the response
 * contains valid authentication tokens and account information.
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate unique email for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  // Register new member using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Validate complete response structure
  typia.assert(authorized);
  // Validate member ID is a valid UUID
  TestValidator.equals(
    "member ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
    true,
  );
  // Validate optional fields are null when not provided
  TestValidator.equals("display_name is null", authorized.display_name, null);
  TestValidator.equals("bio is null", authorized.bio, null);
  // Validate account is active
  TestValidator.equals("account is not banned", authorized.banned, false);
  TestValidator.equals("account is not deleted", authorized.deleted_at, null);
  // Validate timestamps exist
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      authorized.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      authorized.updated_at,
    ),
  );
  // Validate JWT tokens exist
  TestValidator.predicate(
    "access token is non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorized.token.refresh.length > 0,
  );
  // Validate token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      authorized.token.refreshable_until,
    ),
  );
  // Validate that memberConnection now has Authorization header set
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
}
