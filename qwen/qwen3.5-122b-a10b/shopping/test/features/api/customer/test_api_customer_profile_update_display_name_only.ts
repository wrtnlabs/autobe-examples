import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin profile update with display name only modification.
 *
 * Validates that an authenticated administrator can update only the display_name field of their own customer profile while preserving the phone_number value. This tests partial update functionality where only one field is modified in the request body.
 *
 * The test follows these steps:
 * 1. Administrator registers and authenticates via /ecommerce/auth/admin/join
 * 2. Creates admin-specific connection with authorization token
 * 3. Calls PATCH /ecommerce/admin/profiles with body containing only display_name
 * 4. Validates response contains the updated display_name
 * 5. Validates phone_number remains unchanged (preserved as null)
 *
 * This ensures the API correctly handles partial updates without requiring all fields to be present in the request body.
 */
export async function test_api_customer_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Update only display_name, leaving phone_number unchanged
  const updateBody: IEcommerceCustomer.IUpdate = {
    display_name: RandomGenerator.name(),
  };
  const updatedCustomer = await api.functional.ecommerce.admin.profiles.update(
    adminConnection,
    {
      body: updateBody satisfies IEcommerceCustomer.IUpdate,
    },
  );
  typia.assert(updatedCustomer);
  // 3. Validate display_name was updated
  TestValidator.equals(
    "display_name should be updated",
    updatedCustomer.display_name,
    updateBody.display_name,
  );
  // 4. Validate phone_number remains unchanged (should be null since we didn't set it)
  TestValidator.equals(
    "phone_number should remain unchanged",
    updatedCustomer.phone_number,
    null,
  );
}
