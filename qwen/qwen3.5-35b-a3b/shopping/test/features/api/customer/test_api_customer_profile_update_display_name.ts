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

export async function test_api_customer_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const registered: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(registered);
  // 2. Store initial profile data
  const initialDisplayName = registered.display_name;
  const initialCreatedAt = registered.created_at;
  const initialPhoneNumber = registered.phone_number;
  const initialStatus = registered.status;
  const initialEmail = registered.email;
  const initialId = registered.id;
  // 3. Generate new display name (1-100 chars, allowed characters)
  const newDisplayName = RandomGenerator.name(5); // 3-7 chars per word * 5 words
  // 4. Update customer profile (reuse same connection with updated headers)
  const updated: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: newDisplayName,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(updated);
  // 5. Validate display name was updated
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    newDisplayName,
  );
  // 6. Validate other fields remain unchanged
  TestValidator.equals("id unchanged", updated.id, initialId);
  TestValidator.equals(
    "phone_number unchanged",
    updated.phone_number,
    initialPhoneNumber,
  );
  TestValidator.equals("status unchanged", updated.status, initialStatus);
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    initialCreatedAt,
  );
  // 7. Validate updated_at is newer than initial time
  TestValidator.predicate(
    "updated_at is newer",
    updated.updated_at > initialCreatedAt,
  );
}