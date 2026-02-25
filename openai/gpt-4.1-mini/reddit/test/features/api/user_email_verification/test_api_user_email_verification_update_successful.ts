import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Register a new user to obtain authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorized.token.access };
  // Assuming the system automatically creates an email verification record on user join,
  // we need to fetch or simulate fetching an existing email verification record.
  // Since no GET endpoint is provided and no create endpoint for email verification is given,
  // we simulate by creating an id corresponding to the user.
  // Using typia.random to create an existing email verification record with user_id set to authorized.id
  // and needed fields for update.
  const existingEmailVerification: ICommunityPlatformUserEmailVerification = {
    id: typia.random<string & tags.Format<"uuid">>(),
    user_id: authorized.id,
    token: typia.random<string>(),
    is_verified: false,
    expires_at: new Date(Date.now() + 7200 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1800 * 1000).toISOString(),
    deleted_at: null,
  };
  // Prepare update payload
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1 hour ahead
  const createdAt = existingEmailVerification.created_at;
  const updatedAt = now.toISOString();
  const updateBody: ICommunityPlatformUserEmailVerification.IUpdate = {
    is_verified: true,
    expires_at: expiresAt,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: null,
  };
  // Perform update
  const updatedRecord =
    await api.functional.communityPlatform.user.email_verifications.updateEmailVerification(
      userConnection,
      {
        id: existingEmailVerification.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRecord);
  // Validate updated fields
  TestValidator.equals(
    "id unchanged",
    updatedRecord.id,
    existingEmailVerification.id,
  );
  TestValidator.equals(
    "user_id unchanged",
    updatedRecord.user_id,
    authorized.id,
  );
  TestValidator.equals(
    "is_verified updated",
    updatedRecord.is_verified,
    updateBody.is_verified,
  );
  TestValidator.equals(
    "expires_at updated",
    updatedRecord.expires_at,
    updateBody.expires_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedRecord.created_at,
    updateBody.created_at,
  );
  TestValidator.equals(
    "updated_at updated",
    updatedRecord.updated_at,
    updateBody.updated_at,
  );
  TestValidator.equals(
    "deleted_at updated",
    updatedRecord.deleted_at,
    updateBody.deleted_at,
  );
}
