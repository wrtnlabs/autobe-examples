import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer with null phone_number initially
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(initialAuth);
  // Capture initial state
  const initialDisplayName: string | null = initialAuth.display_name;
  const initialPhoneNumber: string | null = initialAuth.phone_number;
  // 2. Update only display_name without providing phone_number
  const newDisplayName: string = RandomGenerator.name();
  const updated = await api.functional.ecommerceMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IEcommerceMallCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Verify display_name is updated
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    newDisplayName,
  );
  // 4. Verify phone_number remains unchanged (null)
  TestValidator.equals(
    "phone_number unchanged",
    updated.phone_number,
    initialPhoneNumber,
  );
}
