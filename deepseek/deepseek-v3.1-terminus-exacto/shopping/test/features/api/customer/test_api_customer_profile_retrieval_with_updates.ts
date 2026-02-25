import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_retrieval_with_updates(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Retrieve initial profile
  const initialProfile =
    await api.functional.ecommerce.customer.profile.at(customerConnection);
  typia.assert(initialProfile);
  // Verify initial profile matches registration details
  TestValidator.equals(
    "initial email matches",
    initialProfile.email,
    authorized.email,
  );
  TestValidator.equals(
    "initial display name matches",
    initialProfile.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "initial phone number matches",
    initialProfile.phone_number,
    authorized.phone_number,
  );
  // Update profile with new information
  const updateData = {
    display_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }).substring(0, 50),
    phone_number: RandomGenerator.mobile(),
  } satisfies IEcommerceCustomer.IUpdate;
  const updatedProfile = await api.functional.ecommerce.customer.profile.update(
    customerConnection,
    {
      body: updateData,
    },
  );
  typia.assert(updatedProfile);
  // Verify updated profile reflects changes
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    authorized.email,
  );
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    updateData.display_name,
  );
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    updateData.phone_number,
  );
  TestValidator.equals(
    "id remains unchanged",
    updatedProfile.id,
    authorized.id,
  );
  // Verify timestamps from initial creation
  TestValidator.equals(
    "created_at remains unchanged",
    updatedProfile.created_at,
    initialProfile.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    initialProfile.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedProfile.deleted_at === null,
  );
}
