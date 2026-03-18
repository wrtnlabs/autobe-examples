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

export async function test_api_addresses_default_retrieval_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberAAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberAConnection,
      {
        body: {
          recipient_name: `A-${RandomGenerator.name()}`,
          phone_number: RandomGenerator.mobile(),
          postal_code:
            `${RandomGenerator.alphabets(2)}${typia.random<number & tags.Type<"uint32">>()}`.slice(
              0,
              10,
            ),
          country: RandomGenerator.pick(["Korea", "Japan", "USA"] as const),
          city: `City-${RandomGenerator.alphabets(5)}`,
          street_line1: `Street-${RandomGenerator.alphabets(8)}`,
          street_line2: null,
          is_default: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(memberAAddress);
  await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
    memberAConnection,
    {
      body: {
        id: memberAAddress.id,
      } satisfies IShoppingMallAddress.ISetDefault,
    },
  );
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberBAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberBConnection,
      {
        body: {
          recipient_name: `B-${RandomGenerator.name()}`,
          phone_number: RandomGenerator.mobile(),
          postal_code:
            `${RandomGenerator.alphabets(2)}${typia.random<number & tags.Type<"uint32">>()}`.slice(
              0,
              10,
            ),
          country: RandomGenerator.pick(["Korea", "Japan", "USA"] as const),
          city: `City-${RandomGenerator.alphabets(5)}`,
          street_line1: `Street-${RandomGenerator.alphabets(8)}`,
          street_line2: null,
          is_default: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(memberBAddress);
  await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
    memberBConnection,
    {
      body: {
        id: memberBAddress.id,
      } satisfies IShoppingMallAddress.ISetDefault,
    },
  );
  const defaultAddress =
    await api.functional.shoppingMall.member.addresses._default.at(
      memberBConnection,
    );
  typia.assert(defaultAddress);
  TestValidator.equals(
    "default id belongs to member B",
    defaultAddress.id,
    memberBAddress.id,
  );
  TestValidator.equals(
    "default recipient matches member B",
    defaultAddress.recipientName,
    memberBAddress.recipientName,
  );
  TestValidator.equals(
    "default phone matches member B",
    defaultAddress.phoneNumber,
    memberBAddress.phoneNumber,
  );
  TestValidator.equals(
    "default postal code matches member B",
    defaultAddress.postalCode,
    memberBAddress.postalCode,
  );
  TestValidator.equals(
    "default isDefault true",
    defaultAddress.isDefault,
    memberBAddress.isDefault,
  );
  TestValidator.equals(
    "default country matches member B",
    defaultAddress.country,
    memberBAddress.country,
  );
  TestValidator.equals(
    "default city matches member B",
    defaultAddress.city,
    memberBAddress.city,
  );
  TestValidator.equals(
    "default streetLine1 matches member B",
    defaultAddress.streetLine1,
    memberBAddress.streetLine1,
  );
  TestValidator.equals(
    "default streetLine2 matches member B",
    defaultAddress.streetLine2,
    memberBAddress.streetLine2,
  );
  TestValidator.notEquals(
    "default id differs from member A",
    defaultAddress.id,
    memberAAddress.id,
  );
  TestValidator.notEquals(
    "default recipient differs from member A",
    defaultAddress.recipientName,
    memberAAddress.recipientName,
  );
}
