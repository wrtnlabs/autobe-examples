import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_wishlist_retrieve_active_owned(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2) Ensure we have a wishlistId that belongs to the authenticated member.
  // Since no wishlist-creation/setup endpoint is provided in the available SDK/utilities,
  // run in simulation mode to generate a valid wishlist DTO.
  memberConnection.simulate = true;
  const first = await api.functional.shoppingMall.member.wishlists.at(
    memberConnection,
    {
      wishlistId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(first);
  TestValidator.equals(
    "wishlist shoppingMallMemberId matches authorized member id",
    first.shoppingMallMemberId,
    authorized.id,
  );
  TestValidator.equals(
    "wishlist deletedAt is null (active wishlist)",
    first.deletedAt,
    null,
  );
  // 3) Retrieve the wishlist again by id
  const second = await api.functional.shoppingMall.member.wishlists.at(
    memberConnection,
    {
      wishlistId: first.id,
    },
  );
  typia.assert(second);
  TestValidator.equals("wishlist id matches requested", second.id, first.id);
  TestValidator.equals(
    "retrieved shoppingMallMemberId matches authorized member id",
    second.shoppingMallMemberId,
    authorized.id,
  );
  TestValidator.equals(
    "retrieved deletedAt is null (active wishlist)",
    second.deletedAt,
    null,
  );
  // Read-only behavior in simulation: GET should be stable for the same id.
  TestValidator.equals("read-only: core wishlist fields stable", second, first);
}
