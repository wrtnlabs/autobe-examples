import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSession";
import { prepare_random_shopping_mall_cart_session } from "../../../prepare/prepare_random_shopping_mall_cart_session";
import { generate_random_shopping_mall_cart_sessions_create } from "../../../generate/generate_random_shopping_mall_cart_sessions_create";
export async function test_api_cart_session_creation_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Create a new guest connection for unauthenticated requests
  const guestConnection: api.IConnection = { host: connection.host };
  // Use the generation function for cart session creation (priority over SDK function)
  const cartSession = await generate_random_shopping_mall_cart_sessions_create(
    guestConnection,
    {},
  );
  // Validate the response structure
  typia.assert(cartSession);
  // Assertions for guest session characteristics
  TestValidator.equals("session ID is a valid UUID", cartSession.id.length, 36);
  TestValidator.equals(
    "customer_id is null for guest session",
    cartSession.customer_id,
    null,
  );
  TestValidator.equals(
    "guest_session flag is true",
    cartSession.guest_session,
    true,
  );
  TestValidator.equals(
    "session status is active",
    cartSession.session_status,
    "active",
  );
  TestValidator.equals("item count starts at zero", cartSession.item_count, 0);
  TestValidator.equals(
    "total price starts at zero",
    cartSession.total_price,
    0,
  );
  // Validate expires_at is within 30 days of creation
  const createdDate = new Date(cartSession.created_at);
  const expiresDate = new Date(cartSession.expires_at);
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const timeDifference = expiresDate.getTime() - createdDate.getTime();
  TestValidator.predicate(
    "expires_at is within 30 days of creation",
    timeDifference >= thirtyDaysInMs * 0.95 &&
      timeDifference <= thirtyDaysInMs * 1.05,
  );
}
