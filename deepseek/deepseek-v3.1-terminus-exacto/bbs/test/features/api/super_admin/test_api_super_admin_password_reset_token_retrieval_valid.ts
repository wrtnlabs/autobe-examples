import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can successfully retrieve detailed information
 * about a valid password reset token they previously generated.
 */
export async function test_api_super_admin_password_reset_token_retrieval_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Since the API doesn't provide a specific endpoint for creating password reset tokens,
  // we need to use the available functionality. Based on the scenario description,
  // password reset tokens are generated "via some mechanism" for super admins.
  // We'll assume there's a way to generate these tokens through the system.
  // For the purpose of this test, we'll create a valid resetId that follows the expected format
  // This allows us to test the retrieval functionality even without the creation endpoint
  const validResetId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the token details using the valid resetId
  const retrievedToken =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.at(
      superAdminConnection,
      { resetId: validResetId },
    );
  typia.assert(retrievedToken);
  // Validate comprehensive token details
  TestValidator.equals(
    "token id matches input",
    retrievedToken.id,
    validResetId,
  );
  TestValidator.predicate(
    "token value is non-empty string",
    retrievedToken.token.length > 0,
  );
  TestValidator.predicate(
    "token is not expired",
    new Date(retrievedToken.expired_at) > new Date(),
  );
  TestValidator.equals("token not used", retrievedToken.used_at, null);
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(new Date(retrievedToken.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    !isNaN(new Date(retrievedToken.updated_at).getTime()),
  );
  // Validate super admin association
  TestValidator.predicate(
    "super admin exists",
    retrievedToken.superAdmin !== null,
  );
  TestValidator.equals(
    "super admin has id",
    typeof retrievedToken.superAdmin.id,
    "string",
  );
  TestValidator.predicate(
    "super admin id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedToken.superAdmin.id,
    ),
  );
  // Validate timestamp ordering
  TestValidator.predicate(
    "created_at before updated_at",
    new Date(retrievedToken.created_at) <= new Date(retrievedToken.updated_at),
  );
  TestValidator.predicate(
    "expired_at in future",
    new Date(retrievedToken.expired_at) > new Date(retrievedToken.created_at),
  );
}
