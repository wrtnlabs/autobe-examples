import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

export async function test_api_guest_cart_creation_with_metadata_variants(
  connection: api.IConnection,
) {
  // Variant A: only required guest_token
  const guestTokenA = RandomGenerator.alphaNumeric(32);
  const createBodyA = {
    guest_token: guestTokenA,
  } satisfies IShoppingMallGuestCart.ICreate;

  const cartA: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBodyA,
    });
  typia.assert<IShoppingMallGuestCart>(cartA);

  TestValidator.equals(
    "guest_token of variant A should match input",
    cartA.guest_token,
    guestTokenA,
  );
  TestValidator.equals(
    "newly created guest cart A should have no items",
    cartA.items,
    [],
  );

  // Variant B: guest_token + ip + user_agent
  const guestTokenB = RandomGenerator.alphaNumeric(32);
  const ipB = "203.0.113.42";
  const userAgentB = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });

  const createBodyB = {
    guest_token: guestTokenB,
    ip: ipB,
    user_agent: userAgentB,
  } satisfies IShoppingMallGuestCart.ICreate;

  const cartB: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBodyB,
    });
  typia.assert<IShoppingMallGuestCart>(cartB);

  TestValidator.equals(
    "guest_token of variant B should match input",
    cartB.guest_token,
    guestTokenB,
  );
  TestValidator.equals("ip of variant B should match input", cartB.ip, ipB);
  TestValidator.equals(
    "user_agent of variant B should match input",
    cartB.user_agent,
    userAgentB,
  );
  TestValidator.equals(
    "newly created guest cart B should have no items",
    cartB.items,
    [],
  );

  // Variant C: full context with referrer and region_code
  const guestTokenC = RandomGenerator.alphaNumeric(32);
  const ipC = "198.51.100.23";
  const userAgentC = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 10,
  });
  const referrerC = typia.random<string & tags.Format<"uri">>();
  const regionCodeC = "KR";

  const createBodyC = {
    guest_token: guestTokenC,
    ip: ipC,
    user_agent: userAgentC,
    referrer: referrerC,
    region_code: regionCodeC,
  } satisfies IShoppingMallGuestCart.ICreate;

  const cartC: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBodyC,
    });
  typia.assert<IShoppingMallGuestCart>(cartC);

  TestValidator.equals(
    "guest_token of variant C should match input",
    cartC.guest_token,
    guestTokenC,
  );
  TestValidator.equals("ip of variant C should match input", cartC.ip, ipC);
  TestValidator.equals(
    "user_agent of variant C should match input",
    cartC.user_agent,
    userAgentC,
  );
  TestValidator.equals(
    "referrer of variant C should match input",
    cartC.referrer,
    referrerC,
  );
  TestValidator.equals(
    "newly created guest cart C should have no items",
    cartC.items,
    [],
  );

  // Read-back validation for Variant C
  const reloadedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.at(connection, {
      guestCartId: cartC.id,
    });
  typia.assert<IShoppingMallGuestCart>(reloadedCart);

  TestValidator.equals(
    "reloaded cart id should match original cart C id",
    reloadedCart.id,
    cartC.id,
  );
  TestValidator.equals(
    "reloaded cart guest_token should match original cart C guest_token",
    reloadedCart.guest_token,
    cartC.guest_token,
  );
  TestValidator.equals(
    "reloaded cart ip should match original cart C ip",
    reloadedCart.ip,
    cartC.ip,
  );
  TestValidator.equals(
    "reloaded cart user_agent should match original cart C user_agent",
    reloadedCart.user_agent,
    cartC.user_agent,
  );
  TestValidator.equals(
    "reloaded cart referrer should match original cart C referrer",
    reloadedCart.referrer,
    cartC.referrer,
  );
  TestValidator.equals(
    "reloaded cart items should match original cart C items (empty array)",
    reloadedCart.items,
    cartC.items,
  );
}
