import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_invalid_credentials_rejected(
  connection: api.IConnection,
): Promise<void> {
  // ── Scenario A: Non-existent email ──────────────────────────────────────
  // Use a completely random email that has never been registered.
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(16);
  let errorA: unknown = undefined;
  try {
    const connA: api.IConnection = { host: connection.host };
    await authorize_seller_login(connA, {
      body: {
        email: nonExistentEmail,
        password: randomPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  } catch (e) {
    errorA = e;
  }
  TestValidator.predicate(
    "non-existent email login must be rejected",
    errorA !== undefined,
  );
  // ── Scenario B: Wrong password for existing seller ───────────────────────
  // Register a seller with known credentials.
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  const connJoin: api.IConnection = { host: connection.host };
  await authorize_seller_join(connJoin, {
    body: {
      email: sellerEmail,
      password: correctPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  let errorB: unknown = undefined;
  try {
    const connB: api.IConnection = { host: connection.host };
    await authorize_seller_login(connB, {
      body: {
        email: sellerEmail,
        password: wrongPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  } catch (e) {
    errorB = e;
  }
  TestValidator.predicate(
    "wrong password login must be rejected",
    errorB !== undefined,
  );
  // ── Non-disclosure verification ─────────────────────────────────────────
  // Both errors must be indistinguishable (same message), ensuring no
  // information about which field (email vs password) caused the failure.
  const messageA =
    errorA instanceof Error ? errorA.message : JSON.stringify(errorA);
  const messageB =
    errorB instanceof Error ? errorB.message : JSON.stringify(errorB);
  TestValidator.equals(
    "error messages must be identical to prevent enumeration attacks",
    messageA,
    messageB,
  );
}
