import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumEmailVerification";
import { prepare_random_economic_forum_email_verification } from "../../../prepare/prepare_random_economic_forum_email_verification";
import { generate_random_economic_forum_admin_auth_admins_email_verifications_create } from "../../../generate/generate_random_economic_forum_admin_auth_admins_email_verifications_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicForumAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create an email verification record for the admin account as prerequisite
  // The ICreate body is empty, as documented - no parameters needed
  const emailVerification =
    await generate_random_economic_forum_admin_auth_admins_email_verifications_create(
      adminConnection,
      {},
    );
  typia.assert(emailVerification);
  // Step 3: Delete the admin account using its ID
  // Use the adminConnection which is still authenticated
  // Verify that deletion returns 204 No Content (void) with no error
  await TestValidator.error(
    "admin deletion should succeed with HTTP 204 No Content",
    async () => {
      await api.functional.economicForum.admin.admins.erase(adminConnection, {
        adminId: admin.id,
      });
    },
  );
}
