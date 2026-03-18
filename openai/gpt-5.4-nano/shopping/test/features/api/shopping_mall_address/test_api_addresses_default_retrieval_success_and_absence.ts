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

export async function test_api_addresses_default_retrieval_success_and_absence(
  connection: api.IConnection,
): Promise<void> {
  // ------------------------------
  // Scenario 1: success
  // ------------------------------
  {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
    const addressA =
      await generate_random_shopping_mall_member_addresses_create(
        memberConnection,
        {
          body: {
            recipient_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            postal_code: typia.random<string>(),
            country: RandomGenerator.name(1),
            city: RandomGenerator.name(1),
            street_line1: RandomGenerator.name(2),
            street_line2: null,
            is_default: false,
          } satisfies IShoppingMallAddress.ICreate,
        },
      );
    typia.assert(addressA);
    const setDefaultA =
      await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
        memberConnection,
        {
          body: {
            id: addressA.id,
          } satisfies IShoppingMallAddress.ISetDefault,
        },
      );
    typia.assert(setDefaultA);
    const defaultAddress =
      await api.functional.shoppingMall.member.addresses._default.at(
        memberConnection,
      );
    typia.assert(defaultAddress);
    TestValidator.equals(
      "default address id matches set address",
      defaultAddress.id,
      addressA.id,
    );
    TestValidator.equals(
      "default address recipientName",
      defaultAddress.recipientName,
      addressA.recipientName,
    );
    TestValidator.equals(
      "default address phoneNumber",
      defaultAddress.phoneNumber,
      addressA.phoneNumber,
    );
    TestValidator.equals(
      "default address postalCode",
      defaultAddress.postalCode,
      addressA.postalCode,
    );
    TestValidator.equals(
      "default address country",
      defaultAddress.country,
      addressA.country,
    );
    TestValidator.equals(
      "default address city",
      defaultAddress.city,
      addressA.city,
    );
    TestValidator.equals(
      "default address streetLine1",
      defaultAddress.streetLine1,
      addressA.streetLine1,
    );
    TestValidator.equals(
      "default address streetLine2",
      defaultAddress.streetLine2,
      addressA.streetLine2,
    );
    TestValidator.equals(
      "default address isDefault is true",
      defaultAddress.isDefault,
      true,
    );
  }
  // ------------------------------
  // Scenario 2: absence
  // ------------------------------
  {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
    const defaultAddress =
      await api.functional.shoppingMall.member.addresses._default.at(
        memberConnection,
      );
    typia.assert(defaultAddress);
    TestValidator.equals(
      "absence: isDefault should be false",
      defaultAddress.isDefault,
      false,
    );
  }
  // ------------------------------
  // Scenario 3: replacement after default deletion
  // ------------------------------
  {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
    const addressA =
      await generate_random_shopping_mall_member_addresses_create(
        memberConnection,
        {
          body: {
            recipient_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            postal_code: typia.random<string>(),
            country: RandomGenerator.name(1),
            city: RandomGenerator.name(1),
            street_line1: RandomGenerator.name(2),
            street_line2: null,
            is_default: false,
          } satisfies IShoppingMallAddress.ICreate,
        },
      );
    typia.assert(addressA);
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: typia.random<string>(),
          country: RandomGenerator.name(1),
          city: RandomGenerator.name(1),
          street_line1: RandomGenerator.name(2),
          street_line2: null,
          is_default: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
    await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
      memberConnection,
      {
        body: {
          id: addressA.id,
        } satisfies IShoppingMallAddress.ISetDefault,
      },
    );
    await api.functional.shoppingMall.member.addresses.erase(memberConnection, {
      addressId: addressA.id,
    });
    const defaultAfterDeletion =
      await api.functional.shoppingMall.member.addresses._default.at(
        memberConnection,
      );
    typia.assert(defaultAfterDeletion);
    TestValidator.equals(
      "after deletion: isDefault should be false",
      defaultAfterDeletion.isDefault,
      false,
    );
    TestValidator.notEquals(
      "after deletion: deleted address should not be default",
      defaultAfterDeletion.id,
      addressA.id,
    );
  }
}
