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

export async function test_api_customer_profile_view_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
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
  typia.assert(joinResult);
  // Store original timestamps
  const originalCreatedAt = joinResult.created_at;
  // 2. Update customer profile with new display name and phone number
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: newDisplayName,
          phone_number: newPhoneNumber,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. View customer profile
  const viewedProfile =
    await api.functional.ecommerceMall.customer.profile.at(customerConnection);
  typia.assert(viewedProfile);
  // 4. Validate updated profile information
  TestValidator.equals(
    "display_name matches updated value",
    viewedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number matches updated value",
    viewedProfile.phone_number,
    newPhoneNumber,
  );
  // 5. Validate timestamps - updated_at should be newer than created_at
  TestValidator.predicate(
    "created_at is valid",
    () => viewedProfile.created_at === originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    () =>
      new Date(viewedProfile.updated_at) > new Date(viewedProfile.created_at),
  );
  // 6. Validate account status is active
  TestValidator.equals(
    "account_status is active",
    viewedProfile.account_status,
    "active",
  );
}
