import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_customer_profile_partial_update_preserves_existing_values(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const originalProfile =
    await api.functional.mallPlatform.seller.profile.create(sellerConnection, {
      body: {
        displayName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    });
  typia.assert(originalProfile);
  const firstDisplayName = RandomGenerator.name();
  const updatedDisplayNameProfile =
    await api.functional.mallPlatform.seller.profile.create(sellerConnection, {
      body: {
        displayName: firstDisplayName,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    });
  typia.assert(updatedDisplayNameProfile);
  TestValidator.equals(
    "display name should be updated",
    updatedDisplayNameProfile.displayName,
    firstDisplayName,
  );
  TestValidator.equals(
    "phone number should be preserved when display name changes only",
    updatedDisplayNameProfile.phoneNumber,
    originalProfile.phoneNumber,
  );
  TestValidator.equals(
    "profile id should remain the same after partial update",
    updatedDisplayNameProfile.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "owner id should remain the same after partial update",
    updatedDisplayNameProfile.mallPlatformCustomerId,
    originalProfile.mallPlatformCustomerId,
  );
  TestValidator.equals(
    "createdAt should remain the same after partial update",
    updatedDisplayNameProfile.createdAt,
    originalProfile.createdAt,
  );
  TestValidator.predicate(
    "updatedAt should not go backward after partial update",
    new Date(updatedDisplayNameProfile.updatedAt).getTime() >=
      new Date(originalProfile.updatedAt).getTime(),
  );
  TestValidator.equals(
    "deletedAt should remain unchanged",
    updatedDisplayNameProfile.deletedAt,
    originalProfile.deletedAt,
  );
  const secondPhoneNumber = RandomGenerator.mobile();
  const updatedPhoneProfile =
    await api.functional.mallPlatform.seller.profile.create(sellerConnection, {
      body: {
        phoneNumber: secondPhoneNumber,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    });
  typia.assert(updatedPhoneProfile);
  TestValidator.equals(
    "phone number should be updated",
    updatedPhoneProfile.phoneNumber,
    secondPhoneNumber,
  );
  TestValidator.equals(
    "display name should be preserved when phone number changes only",
    updatedPhoneProfile.displayName,
    firstDisplayName,
  );
  TestValidator.equals(
    "profile id should remain stable across updates",
    updatedPhoneProfile.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "owner id should remain stable across updates",
    updatedPhoneProfile.mallPlatformCustomerId,
    originalProfile.mallPlatformCustomerId,
  );
  TestValidator.predicate(
    "updatedAt should not go backward after second update",
    new Date(updatedPhoneProfile.updatedAt).getTime() >=
      new Date(updatedDisplayNameProfile.updatedAt).getTime(),
  );
  TestValidator.equals(
    "createdAt should remain stable across updates",
    updatedPhoneProfile.createdAt,
    originalProfile.createdAt,
  );
  TestValidator.equals(
    "deletedAt should remain unchanged after second update",
    updatedPhoneProfile.deletedAt,
    originalProfile.deletedAt,
  );
  const repeatedDisplayNameProfile =
    await api.functional.mallPlatform.seller.profile.create(sellerConnection, {
      body: {
        displayName: firstDisplayName,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    });
  typia.assert(repeatedDisplayNameProfile);
  TestValidator.equals(
    "repeated partial update should keep display name",
    repeatedDisplayNameProfile.displayName,
    firstDisplayName,
  );
  TestValidator.equals(
    "repeated partial update should keep phone number",
    repeatedDisplayNameProfile.phoneNumber,
    secondPhoneNumber,
  );
  TestValidator.equals(
    "repeated partial update should keep profile id",
    repeatedDisplayNameProfile.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "repeated partial update should keep owner id",
    repeatedDisplayNameProfile.mallPlatformCustomerId,
    originalProfile.mallPlatformCustomerId,
  );
}
