import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";

export async function test_api_admin_password_reset_token_creation_authorization_and_missing_auth(
  connection: api.IConnection,
) {
  // 1. Prepare base payload for password reset token creation, using a
  // placeholder account_id that will be replaced once we have a real
  // adminUser id. We still keep structure valid (uuid/date-time strings).
  const baseAdminAccountId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const basePayload = {
    account_type: "admin",
    account_id: baseAdminAccountId,
    token_hash: RandomGenerator.alphaNumeric(48),
    purpose: "password_reset",
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  // 2. Attempt creation without any Authorization header, by using a
  // cloned connection scoped to this unauthenticated call.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated admin password reset token creation must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
        unauthenticatedConnection,
        {
          body: basePayload,
        },
      );
    },
  );

  // 3. Register a new adminUser to obtain an authenticated context.
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorizedAdmin);

  // 4. Reuse payload but ensure account_id matches the real adminUser id.
  const createPayload = {
    ...basePayload,
    account_id: authorizedAdmin.id,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const createdToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: createPayload,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(createdToken);

  // 5. Validate core fields match what we requested.
  TestValidator.equals(
    "created token account_type matches request",
    createdToken.account_type,
    createPayload.account_type,
  );
  TestValidator.equals(
    "created token account_id matches request",
    createdToken.account_id,
    createPayload.account_id,
  );
  TestValidator.equals(
    "created token purpose matches request",
    createdToken.purpose,
    createPayload.purpose,
  );
  TestValidator.equals(
    "created token expires_at matches request",
    createdToken.expires_at,
    createPayload.expires_at,
  );
}
