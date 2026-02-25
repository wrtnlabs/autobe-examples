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

export async function test_api_customer_profile_update_successful_profile_modification(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register customer and get authentication
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // Store original values for comparison
  const originalDisplayName = joinResponse.display_name;
  const originalPhoneNumber = joinResponse.phone_number;
  // Generate updated profile data
  const updatedDisplayName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  }).substring(0, 50);
  const updatedPhoneNumber = RandomGenerator.mobile();
  // Update customer profile
  const updateResponse = await api.functional.ecommerce.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: updatedDisplayName,
        phone_number: updatedPhoneNumber,
      } satisfies IEcommerceCustomer.IUpdate,
    },
  );
  typia.assert(updateResponse);
  // Validate updated fields
  TestValidator.equals(
    "display name updated",
    updateResponse.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updateResponse.phone_number,
    updatedPhoneNumber,
  );
  // Validate unchanged fields remain the same
  TestValidator.equals(
    "email remains unchanged",
    updateResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "id remains unchanged",
    updateResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updateResponse.created_at,
    joinResponse.created_at,
  );
  // Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at should change",
    updateResponse.updated_at,
    joinResponse.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => !isNaN(new Date(updateResponse.updated_at).getTime()),
  );
}
