import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_address_retrieval_own_address_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const address1 = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: RandomGenerator.pick(["US", "KR", "JP"] as const),
        city: RandomGenerator.name(),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address1);
  const address2 = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: RandomGenerator.pick(["US", "KR", "JP"] as const),
        city: RandomGenerator.name(),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address2);
  const got1 = await api.functional.shoppingMall.member.addresses.at(
    memberConnection,
    {
      addressId: address1.id,
    },
  );
  typia.assert(got1);
  TestValidator.equals("address1 id", got1.id, address1.id);
  TestValidator.equals(
    "recipientName",
    got1.recipientName,
    address1.recipientName,
  );
  TestValidator.equals("phoneNumber", got1.phoneNumber, address1.phoneNumber);
  TestValidator.equals("streetLine1", got1.streetLine1, address1.streetLine1);
  TestValidator.equals("streetLine2", got1.streetLine2, address1.streetLine2);
  TestValidator.equals("city", got1.city, address1.city);
  TestValidator.equals("postalCode", got1.postalCode, address1.postalCode);
  TestValidator.equals("country", got1.country, address1.country);
  TestValidator.equals("isDefault initially true", got1.isDefault, true);
  const gotSetDefault =
    await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
      memberConnection,
      {
        body: {
          id: address2.id,
        } satisfies IShoppingMallAddress.ISetDefault,
      },
    );
  typia.assert(gotSetDefault);
  const got1After = await api.functional.shoppingMall.member.addresses.at(
    memberConnection,
    {
      addressId: address1.id,
    },
  );
  typia.assert(got1After);
  TestValidator.equals(
    "recipientName unchanged",
    got1After.recipientName,
    got1.recipientName,
  );
  TestValidator.equals(
    "phoneNumber unchanged",
    got1After.phoneNumber,
    got1.phoneNumber,
  );
  TestValidator.equals(
    "streetLine1 unchanged",
    got1After.streetLine1,
    got1.streetLine1,
  );
  TestValidator.equals(
    "streetLine2 unchanged",
    got1After.streetLine2,
    got1.streetLine2,
  );
  TestValidator.equals("city unchanged", got1After.city, got1.city);
  TestValidator.equals(
    "postalCode unchanged",
    got1After.postalCode,
    got1.postalCode,
  );
  TestValidator.equals("country unchanged", got1After.country, got1.country);
  TestValidator.equals(
    "isDefault changed to false",
    got1After.isDefault,
    false,
  );
}
