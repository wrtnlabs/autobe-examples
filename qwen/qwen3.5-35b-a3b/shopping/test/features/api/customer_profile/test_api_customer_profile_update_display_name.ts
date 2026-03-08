import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join to establish authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customerAuth);
  // Create authenticated customer connection
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerAuth.token.access,
    },
  };
  // 2. Generate display names for initial and update
  const initialDisplayName = RandomGenerator.paragraph({ sentences: 2 });
  const newDisplayName = RandomGenerator.paragraph({ sentences: 3 });
  // 3. Create initial profile with display name
  const initialProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      authenticatedConnection,
      {
        body: {} satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // 4. Update profile with new display name
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      authenticatedConnection,
      {
        body: {} satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate update response
  TestValidator.equals(
    "displayName updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.notEquals(
    "createdAt and updatedAt differ",
    initialProfile.createdAt,
    initialProfile.updatedAt,
  );
  // 6. Verify the updated displayName is persisted for future operations
  const reFetchProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      authenticatedConnection,
      {
        body: {} satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(reFetchProfile);
  TestValidator.equals(
    "displayName persisted",
    reFetchProfile.displayName,
    newDisplayName,
  );
}
