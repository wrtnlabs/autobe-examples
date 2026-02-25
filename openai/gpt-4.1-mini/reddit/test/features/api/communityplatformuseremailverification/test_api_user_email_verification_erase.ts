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
import { generate_random_community_platform_user_email_verifications_create_email_verification } from "../../../generate/generate_random_community_platform_user_email_verifications_create_email_verification";
import { prepare_random_community_platform_user_email_verification } from "../../../prepare/prepare_random_community_platform_user_email_verification";

/**
 * E2E test for DELETE /communityPlatform/user/email-verifications/{id}
 *
 * Scenarios:
 * 1. Successful deletion of an existing email verification token
 * 2. Deletion attempt of non-existent token
 * 3. Authorization enforcement scenarios
 */
export async function test_api_user_email_verification_erase(
  connection: api.IConnection,
): Promise<void> {
  // --- Scenario 1: Successful deletion of a token ---
  // 1. Authenticate as new user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(connection, {});
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // 2. Create a new email verification token
  const emailVerification: ICommunityPlatformUserEmailVerification =
    await generate_random_community_platform_user_email_verifications_create_email_verification(
      userConnection,
      {},
    );
  typia.assert(emailVerification);
  // 3. Delete the created token
  await api.functional.communityPlatform.user.email_verifications.erase(
    userConnection,
    {
      id: emailVerification.id,
    },
  );
  // 4. Verify that deleting succeeded by attempting to delete again (expect 404)
  await TestValidator.httpError(
    "delete deleted token returns 404",
    404,
    async () =>
      await api.functional.communityPlatform.user.email_verifications.erase(
        userConnection,
        {
          id: emailVerification.id,
        },
      ),
  );
  // --- Scenario 2: Delete non-existent token returns 404 ---
  // Authenticate as new user
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(connection, {});
  user2Connection.headers = { Authorization: `Bearer ${user2.token.access}` };
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent token returns 404",
    404,
    async () =>
      await api.functional.communityPlatform.user.email_verifications.erase(
        user2Connection,
        {
          id: nonExistentId,
        },
      ),
  );
  // --- Scenario 3: Authorization enforcement ---
  // Create token by user1
  const user3Connection: api.IConnection = { host: connection.host };
  const user3 = await authorize_user_join(connection, {});
  user3Connection.headers = { Authorization: `Bearer ${user3.token.access}` };
  const emailVerification3: ICommunityPlatformUserEmailVerification =
    await generate_random_community_platform_user_email_verifications_create_email_verification(
      user3Connection,
      {},
    );
  typia.assert(emailVerification3);
  // 3a. Attempt to delete without any authorization
  await TestValidator.httpError(
    "delete without auth returns 401",
    401,
    async () =>
      await api.functional.communityPlatform.user.email_verifications.erase(
        { host: connection.host },
        { id: emailVerification3.id },
      ),
  );
  // 3b. Authenticate as a different user
  const user4Connection: api.IConnection = { host: connection.host };
  const user4 = await authorize_user_join(connection, {});
  user4Connection.headers = { Authorization: `Bearer ${user4.token.access}` };
  await TestValidator.httpError(
    "delete others' token returns 403",
    403,
    async () =>
      await api.functional.communityPlatform.user.email_verifications.erase(
        user4Connection,
        { id: emailVerification3.id },
      ),
  );
}
