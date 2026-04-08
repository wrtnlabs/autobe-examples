import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_export_by_authenticated_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Call the export endpoint with customer authentication
  const exportedProfile =
    await api.functional.ecommerceMall.customer.profile._export.exportData(
      customerConnection,
    );
  typia.assert(exportedProfile);
  // 3. Verify response contains required fields for customer profile
  TestValidator.equals(
    "profile type is customer",
    exportedProfile.profileType,
    "customer",
  );
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      exportedProfile.id,
    ),
  );
  TestValidator.predicate(
    "customerId is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      exportedProfile.customerId!,
    ),
  );
  TestValidator.equals(
    "customerId matches authorized customer id",
    exportedProfile.customerId,
    authorized.id,
  );
  TestValidator.predicate(
    "displayName exists and is string",
    typeof exportedProfile.displayName === "string" &&
      exportedProfile.displayName.length > 0,
  );
  TestValidator.predicate(
    "phone is null or string",
    exportedProfile.phone === null || typeof exportedProfile.phone === "string",
  );
  // 4. Validate timestamps are valid ISO 8601 date-time formats
  TestValidator.predicate(
    "createdAt is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      exportedProfile.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      exportedProfile.updatedAt,
    ),
  );
  // 5. Confirm timestamps are reasonable (not too far in past or future)
  const createdDate = new Date(exportedProfile.createdAt);
  const updatedDate = new Date(exportedProfile.updatedAt);
  const now = new Date();
  TestValidator.predicate(
    "createdAt is recent",
    createdDate.getTime() <= now.getTime() &&
      now.getTime() - createdDate.getTime() < 60000,
  );
  TestValidator.predicate(
    "updatedAt is recent",
    updatedDate.getTime() <= now.getTime() &&
      now.getTime() - updatedDate.getTime() < 60000,
  );
  // 6. Verify seller-specific fields are not present for customer profile
  TestValidator.equals(
    "sellerId is undefined",
    exportedProfile.sellerId,
    undefined,
  );
  TestValidator.equals("name is undefined", exportedProfile.name, undefined);
  TestValidator.equals(
    "description is undefined",
    exportedProfile.description,
    undefined,
  );
  TestValidator.equals(
    "logoUri is undefined",
    exportedProfile.logoUri,
    undefined,
  );
}
