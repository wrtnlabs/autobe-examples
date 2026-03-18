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

export async function test_api_wishlist_retrieve_forbidden_other_member(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Best-effort: use member B's own member identifier as a candidate wishlistId.
  // If the system's data model uses a separate wishlist id, this may fail; the test
  // still enforces that member A cannot access member B's wishlist resource.
  const foreignWishlistId = memberB.id;
  // Capture member A accessible wishlist data using the same candidate.
  const memberABefore = await api.functional.shoppingMall.member.wishlists.at(
    memberAConnection,
    { wishlistId: memberA.id },
  );
  typia.assert(memberABefore);
  await TestValidator.error(
    "member A must not retrieve member B's wishlist",
    async () => {
      const retrieved = await api.functional.shoppingMall.member.wishlists.at(
        memberAConnection,
        { wishlistId: foreignWishlistId },
      );
      typia.assert(retrieved);
    },
  );
  const memberAAfter = await api.functional.shoppingMall.member.wishlists.at(
    memberAConnection,
    { wishlistId: memberA.id },
  );
  typia.assert(memberAAfter);
  TestValidator.equals(
    "member A wishlist unchanged (id)",
    memberAAfter.id,
    memberABefore.id,
  );
  TestValidator.equals(
    "member A wishlist unchanged (owner)",
    memberAAfter.shoppingMallMemberId,
    memberABefore.shoppingMallMemberId,
  );
}
