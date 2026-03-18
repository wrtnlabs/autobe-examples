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

export async function test_api_address_default_set_when_no_addresses_exist(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const password = typia.random<string & tags.Format<"password">>();
  const email = typia.random<string & tags.Format<"email">>();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(member);
  // 2) Intentionally do not create any addresses.
  // 3) Try to set a default address with a UUID that doesn't belong to the member.
  const nonOwnedAddressId = typia.random<string & tags.Format<"uuid">>();
  const requestBody = {
    id: nonOwnedAddressId,
  } satisfies IShoppingMallAddress.ISetDefault;
  // 4) Validate rejection
  await TestValidator.error(
    "should reject setting default when no addresses exist",
    async () => {
      await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
        memberConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
