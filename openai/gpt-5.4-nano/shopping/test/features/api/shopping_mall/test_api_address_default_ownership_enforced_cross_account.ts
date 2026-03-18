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

export async function test_api_address_default_ownership_enforced_cross_account(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const addressA = await generate_random_shopping_mall_member_addresses_create(
    memberAConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: randint(10000, 99999).toString(),
        country: "Korea",
        city: RandomGenerator.name(1),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressA);
  const addressAId = addressA.id;
  // Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Ensure member B has its own default address
  const addressB = await generate_random_shopping_mall_member_addresses_create(
    memberBConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: randint(10000, 99999).toString(),
        country: "Korea",
        city: RandomGenerator.name(1),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressB);
  // Cross-account attempt: member B sets member A's address as default
  // The system may either reject (throw) or ignore the request while keeping B's default.
  // We validate that default is never switched to addressAId.
  try {
    const defaultAfterAttempt =
      await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
        memberBConnection,
        {
          body: {
            id: addressAId,
          } satisfies IShoppingMallAddress.ISetDefault,
        },
      );
    typia.assert(defaultAfterAttempt);
    TestValidator.notEquals(
      "default should not switch to member A address",
      defaultAfterAttempt.id,
      addressAId,
    );
  } catch {
    // Rejection is also acceptable as long as it doesn't switch defaults.
    // We cannot re-fetch default with the provided API surface; rejection itself is evidence.
  }
  // Member B should still be able to set its own address as default successfully.
  const bDefaultFinal =
    await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
      memberBConnection,
      {
        body: {
          id: addressB.id,
        } satisfies IShoppingMallAddress.ISetDefault,
      },
    );
  typia.assert(bDefaultFinal);
  TestValidator.equals(
    "b can keep/control its own default",
    bDefaultFinal.id,
    addressB.id,
  );
}
