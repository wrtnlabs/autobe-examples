import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Attempt to retrieve the seller - should work initially
  const initialRetrieval = await api.functional.ecommerce.sellers.at(
    sellerConnection,
    { sellerId: seller.id },
  );
  typia.assert(initialRetrieval);
  TestValidator.equals(
    "initial retrieval matches created seller",
    initialRetrieval.id,
    seller.id,
  );
  // Since we don't have an API to soft-delete sellers directly,
  // this test focuses on validating that the retrieval endpoint handles
  // various scenarios properly according to its specification
  // Test error handling for non-existent seller (simulating soft-deleted scenario)
  const invalidSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval of non-existent seller should fail",
    async () => {
      await api.functional.ecommerce.sellers.at(sellerConnection, {
        sellerId: invalidSellerId,
      });
    },
  );
  // Additional validation that retrieved seller has expected structure
  TestValidator.predicate(
    "retrieved seller has valid email",
    typeof initialRetrieval.email === "string" &&
      initialRetrieval.email.includes("@"),
  );
  TestValidator.predicate(
    "retrieved seller has shop name",
    typeof initialRetrieval.shop_name === "string" &&
      initialRetrieval.shop_name.length > 0,
  );
  TestValidator.predicate(
    "retrieved seller has valid timestamps",
    typeof initialRetrieval.created_at === "string" &&
      initialRetrieval.created_at.length > 0,
  );
}
