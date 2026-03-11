import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_registration_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  // Update connection with auth token from admin login
  adminConnection.headers = {
    Authorization: adminUser.token.access,
  };
  // Generate a random seller registration ID for testing
  const sellerRegistrationId = typia.random<string & tags.Format<"uuid">>();
  // Approve seller registration
  const result =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        sellerRegistrationId,
        body: {
          approval_status: "approved",
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  // Verify the approval response
  typia.assert(result);
  // Verify approval status is 'approved'
  TestValidator.equals("approval status", result.approval_status, "approved");
  // Verify responded_at is set
  TestValidator.predicate(
    "responded_at is set",
    result.responded_at !== null && result.responded_at !== undefined,
  );
}
