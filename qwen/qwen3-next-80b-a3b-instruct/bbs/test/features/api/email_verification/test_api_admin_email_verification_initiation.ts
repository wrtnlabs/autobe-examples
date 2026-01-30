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
export async function test_api_admin_email_verification_initiation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Initiate email verification using the generation utility function
  const verification: IEconomicForumEmailVerification =
    await generate_random_economic_forum_admin_auth_admins_email_verifications_create(
      adminConnection,
      {},
    );
  typia.assert(verification);
  // Step 3: Validate the status is set to pending (business logic validation)
  TestValidator.equals("status is pending", verification.status, "pending");
  // Step 4: Validate rate limiting - second request within same hour should fail with 409 Conflict
  await TestValidator.error(
    "second verification attempt within hour should fail with 409 Conflict",
    async () => {
      await generate_random_economic_forum_admin_auth_admins_email_verifications_create(
        adminConnection,
        {},
      );
    },
  );
}
