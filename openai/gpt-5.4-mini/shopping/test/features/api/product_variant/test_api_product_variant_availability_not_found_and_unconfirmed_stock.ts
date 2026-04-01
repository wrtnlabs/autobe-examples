import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_availability_not_found_and_unconfirmed_stock(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa1234!@",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  await TestValidator.httpError(
    "availability should fail for a missing product variant",
    [400, 404],
    async () => {
      await api.functional.mallPlatform.seller.product_variants.availability.at(
        sellerConnection,
        {
          productVariantId: "00000000-0000-0000-0000-000000000001",
        },
      );
    },
  );
  await TestValidator.httpError(
    "availability should fail when stock cannot be trusted",
    [400, 404, 422],
    async () => {
      await api.functional.mallPlatform.seller.product_variants.availability.at(
        sellerConnection,
        {
          productVariantId: "00000000-0000-0000-0000-000000000002",
        },
      );
    },
  );
}
