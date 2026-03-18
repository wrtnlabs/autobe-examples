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

export async function test_api_address_create_default_and_ownership(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: create first default address
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberAUserConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAAuth.token.access,
    },
  };
  const address1 = await generate_random_shopping_mall_member_addresses_create(
    memberAUserConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: "KOR",
        city: RandomGenerator.alphabets(8),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address1);
  TestValidator.equals("isDefault is true", address1.isDefault, true);
  TestValidator.equals("deletedAt is null", address1.deletedAt, null);
  TestValidator.predicate(
    "createdAt is date-time",
    () => !Number.isNaN(Date.parse(address1.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is date-time",
    () => !Number.isNaN(Date.parse(address1.updatedAt)),
  );
  // Scenario 2: only one default
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberBUserConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberBAuth.token.access,
    },
  };
  const addressB1 = await generate_random_shopping_mall_member_addresses_create(
    memberBUserConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: "KOR",
        city: RandomGenerator.alphabets(8),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressB1);
  const addressB2 = await generate_random_shopping_mall_member_addresses_create(
    memberBUserConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: "KOR",
        city: RandomGenerator.alphabets(8),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressB2);
  TestValidator.equals("second isDefault is true", addressB2.isDefault, true);
  const defaultAddressB =
    await api.functional.shoppingMall.member.addresses._default.at(
      memberBUserConnection,
    );
  typia.assert(defaultAddressB);
  TestValidator.equals(
    "default matches second",
    defaultAddressB.id,
    addressB2.id,
  );
  // Scenario 3: ownership protection
  const memberA2Connection: api.IConnection = { host: connection.host };
  const memberA2Auth = await authorize_member_join(memberA2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberA2UserConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberA2Auth.token.access,
    },
  };
  const addressA = await generate_random_shopping_mall_member_addresses_create(
    memberA2UserConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: "KOR",
        city: RandomGenerator.alphabets(8),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressA);
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberCUserConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberCAuth.token.access,
    },
  };
  const addressC = await generate_random_shopping_mall_member_addresses_create(
    memberCUserConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: "KOR",
        city: RandomGenerator.alphabets(8),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressC);
  TestValidator.notEquals(
    "member B/A addresses are different",
    addressC.id,
    addressA.id,
  );
  await TestValidator.error(
    "member B cannot read member A address",
    async () => {
      await api.functional.shoppingMall.member.addresses.at(
        memberCUserConnection,
        { addressId: addressA.id },
      );
    },
  );
  const defaultAddressA =
    await api.functional.shoppingMall.member.addresses._default.at(
      memberA2UserConnection,
    );
  typia.assert(defaultAddressA);
  TestValidator.equals(
    "member A default unaffected",
    defaultAddressA.id,
    addressA.id,
  );
}
