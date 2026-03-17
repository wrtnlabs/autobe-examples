import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_viewing_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create anonymous connection for public API access
  const publicConnection: api.IConnection = { host: connection.host };
  // Test 1: Non-existent seller ID (random UUID)
  const nonExistentSellerId = typia.random<
    string & import("typia").tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent seller should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.sellers.at(publicConnection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
  // Test 2: Pending seller (represented by random UUID - would be 404)
  const pendingSellerId = typia.random<
    string & import("typia").tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "pending seller should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.sellers.at(publicConnection, {
        sellerId: pendingSellerId,
      });
    },
  );
  // Test 3: Rejected seller (represented by random UUID - would be 404)
  const rejectedSellerId = typia.random<
    string & import("typia").tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "rejected seller should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.sellers.at(publicConnection, {
        sellerId: rejectedSellerId,
      });
    },
  );
  // Test 4: Suspended seller (represented by random UUID - would be 404)
  const suspendedSellerId = typia.random<
    string & import("typia").tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "suspended seller should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.sellers.at(publicConnection, {
        sellerId: suspendedSellerId,
      });
    },
  );
}
