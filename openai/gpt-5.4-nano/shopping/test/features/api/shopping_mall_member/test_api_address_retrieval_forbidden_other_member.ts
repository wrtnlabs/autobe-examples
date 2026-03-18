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

export async function test_api_address_retrieval_forbidden_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A signup/auth + create an address
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  const addressPayload = await prepare_random_shopping_mall_address();
  const addressA = await generate_random_shopping_mall_member_addresses_create(
    memberAConnection,
    {
      body: addressPayload,
    },
  );
  typia.assert(addressA);
  // 2) Member B signup/auth
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  // 3) Try to retrieve member A's address as member B
  await TestValidator.error(
    "should forbid retrieving another member's address",
    async () => {
      await api.functional.shoppingMall.member.addresses.at(memberBConnection, {
        addressId: addressA.id,
      });
    },
  );
}
