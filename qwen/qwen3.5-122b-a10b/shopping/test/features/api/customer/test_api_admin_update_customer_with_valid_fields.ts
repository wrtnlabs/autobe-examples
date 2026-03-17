import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator can update customer profile with partial field updates.
 *
 * This test validates that:
 * 1) Admin can authenticate successfully
 * 2) Admin can create/update customer with only display_name
 * 3) Admin can update customer with only phone_number
 * 4) Admin can update customer with both fields together
 * 5) System returns complete customer object after each update
 */
export async function test_api_admin_update_customer_with_valid_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16),
      ),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create customer account to update
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16),
      ),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Update only display_name field
  const updateDisplayName: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.admin.customers.update(adminConnection, {
      customerId,
      body: {
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallCustomer.IUpdate,
    });
  typia.assert(updateDisplayName);
  TestValidator.equals(
    "display_name updated",
    updateDisplayName.display_name !== null,
    true,
  );
  // 4. Update only phone_number field (display_name should remain unchanged)
  const oldDisplayName = updateDisplayName.display_name;
  const updatePhoneNumber: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.admin.customers.update(adminConnection, {
      customerId,
      body: {
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceMallCustomer.IUpdate,
    });
  typia.assert(updatePhoneNumber);
  TestValidator.equals(
    "phone_number updated",
    updatePhoneNumber.phone_number !== null,
    true,
  );
  TestValidator.equals(
    "display_name unchanged",
    updatePhoneNumber.display_name,
    oldDisplayName,
  );
  // 5. Update both fields together
  const updateBoth: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.admin.customers.update(adminConnection, {
      customerId,
      body: {
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceMallCustomer.IUpdate,
    });
  typia.assert(updateBoth);
  TestValidator.notEquals(
    "display_name changed",
    updateBoth.display_name,
    oldDisplayName,
  );
  TestValidator.notEquals(
    "phone_number changed",
    updateBoth.phone_number,
    updatePhoneNumber.phone_number,
  );
}