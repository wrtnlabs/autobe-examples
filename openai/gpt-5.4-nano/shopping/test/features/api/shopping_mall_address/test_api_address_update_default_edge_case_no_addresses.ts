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
import { generate_random_shopping_mall_member_addresses_update_addresses } from "../../../generate/generate_random_shopping_mall_member_addresses_update_addresses";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_address_update_default_edge_case_no_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Ensure initially has no saved shipping addresses (default should be unset)
  await TestValidator.error(
    "default address should be unset when there are no addresses",
    async () => {
      await api.functional.shoppingMall.member.addresses._default.at(
        memberConnection,
      );
    },
  );
  // 3) Attempt to set default when there are no addresses
  await TestValidator.error(
    "default set should fail when there are no addresses",
    async () => {
      const nonExistentId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
        memberConnection,
        {
          body: {
            id: nonExistentId,
          } satisfies IShoppingMallAddress.ISetDefault,
        },
      );
    },
  );
  // 4) Create exactly one address with is_default=false
  const created = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: typia.random<string>(),
        country: RandomGenerator.pick(["South Korea", "Korea"] as const),
        city: RandomGenerator.name(),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: false,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(created);
  // 5) Update the same address to is_default=true using update utility
  const updated =
    await generate_random_shopping_mall_member_addresses_update_addresses(
      memberConnection,
      {
        body: {
          recipient_name: created.recipientName,
          phone_number: created.phoneNumber,
          postal_code: created.postalCode,
          country: created.country,
          city: created.city,
          street_line1: created.streetLine1,
          street_line2: created.streetLine2,
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(updated);
  // 6) Validate that the single address is now the default
  const currentDefault =
    await api.functional.shoppingMall.member.addresses._default.at(
      memberConnection,
    );
  typia.assert(currentDefault);
  TestValidator.equals("default address id", currentDefault.id, created.id);
}
