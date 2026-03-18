import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
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

export async function test_api_address_snapshot_retrieval_forbidden_not_owner(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberAAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberAConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: RandomGenerator.alphabets(8),
          country: RandomGenerator.name(),
          city: RandomGenerator.name(),
          street_line1: RandomGenerator.name(),
          street_line2: null,
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(memberAAddress);
  const memberASnapshot =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberAConnection,
      {
        addressId: memberAAddress.id,
      },
    );
  typia.assert(memberASnapshot);
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Member B must not be able to read Member A's snapshot.
  try {
    await api.functional.shoppingMall.member.addresses.snapshots.at(
      memberBConnection,
      {
        addressId: memberAAddress.id,
        snapshotId: memberASnapshot.id,
      },
    );
    throw new Error("Expected forbidden/unauthorized access to be rejected");
  } catch (exp) {
    const err = exp as unknown;
    TestValidator.predicate(
      "error should be HttpError",
      () => err instanceof api.HttpError,
    );
    const httpError = err as api.HttpError;
    const message = httpError.toJSON().message;
    TestValidator.predicate(
      "error message must not leak snapshot content",
      () =>
        typeof message === "string" &&
        !message.includes("recipient") &&
        !message.includes("postal") &&
        !message.includes("street") &&
        !message.includes("region"),
    );
  }
  // Edge condition: even after Member B creates their own snapshot,
  // they still cannot read Member A's snapshot.
  const memberBAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberBConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: RandomGenerator.alphabets(8),
          country: RandomGenerator.name(),
          city: RandomGenerator.name(),
          street_line1: RandomGenerator.name(),
          street_line2: null,
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(memberBAddress);
  const memberBSnapshot =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberBConnection,
      {
        addressId: memberBAddress.id,
      },
    );
  typia.assert(memberBSnapshot);
  try {
    await api.functional.shoppingMall.member.addresses.snapshots.at(
      memberBConnection,
      {
        addressId: memberAAddress.id,
        snapshotId: memberASnapshot.id,
      },
    );
    throw new Error("Expected forbidden/unauthorized access to be rejected");
  } catch (exp) {
    const err = exp as unknown;
    TestValidator.predicate(
      "error should be HttpError",
      () => err instanceof api.HttpError,
    );
    const httpError = err as api.HttpError;
    const message = httpError.toJSON().message;
    TestValidator.predicate(
      "error message must not leak snapshot content",
      () =>
        typeof message === "string" &&
        !message.includes("recipient") &&
        !message.includes("postal") &&
        !message.includes("street") &&
        !message.includes("region"),
    );
  }
}
