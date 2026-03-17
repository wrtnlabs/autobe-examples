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

export async function test_api_customer_profile_update_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create customer connection with authorization token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: joinResponse.token.access };
  // 3. Capture original phone number before update
  const originalPhoneNumber = joinResponse.phone_number;
  // 4. Update phone number to international format with country code
  const newPhoneNumber = "+8210" + RandomGenerator.alphaNumeric(8);
  const updateBody = {
    phoneNumber: newPhoneNumber,
  } satisfies IEcommerceMallCustomer.IUpdate;
  const updateResponse =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      { body: updateBody },
    );
  typia.assert(updateResponse);
  // 5. Validate phone number is updated in response
  TestValidator.equals(
    "phone number updated in response",
    updateResponse.phone_number,
    newPhoneNumber,
  );
  // 6. Validate phone number is different from original
  TestValidator.notEquals(
    "phone number changed from original",
    updateResponse.phone_number,
    originalPhoneNumber,
  );
  // 7. Verify phone number format is valid international format
  TestValidator.predicate(
    "phone number has international format with country code",
    /^\+\d{11,15}$/.test(updateResponse.phone_number ?? ""),
  );
  // 8. Test updating display_name without affecting phone_number
  const newDisplayName = RandomGenerator.paragraph({ sentences: 2 });
  const updateBody2 = {
    displayName: newDisplayName,
  } satisfies IEcommerceMallCustomer.IUpdate;
  const updateResponse2 =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      { body: updateBody2 },
    );
  typia.assert(updateResponse2);
  // 9. Validate display_name is updated and phone_number is preserved
  TestValidator.equals(
    "display name updated",
    updateResponse2.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number preserved after display_name update",
    updateResponse2.phone_number,
    newPhoneNumber,
  );
  // 10. Test clearing phone number (setting to null)
  const updateBody3 = {
    phoneNumber: null,
  } satisfies IEcommerceMallCustomer.IUpdate;
  const updateResponse3 =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      { body: updateBody3 },
    );
  typia.assert(updateResponse3);
  // 11. Validate phone number is now null
  TestValidator.equals(
    "phone number cleared",
    updateResponse3.phone_number,
    null,
  );
  // 12. Validate display_name is still preserved after clearing phone number
  TestValidator.equals(
    "display name preserved after clearing phone",
    updateResponse3.display_name,
    newDisplayName,
  );
}