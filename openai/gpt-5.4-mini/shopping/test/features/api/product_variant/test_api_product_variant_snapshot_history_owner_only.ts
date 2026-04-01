import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_variant_snapshot_history_owner_only(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_seller_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "password1234" as string & tags.Format<"password">,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(ownerAuthorized);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuthorized = await authorize_seller_join(intruderConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "password1234" as string & tags.Format<"password">,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(intruderAuthorized);
  const targetVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "owner or authorized seller access depends on ownership and existing variant state",
    [401, 403, 404],
    async () => {
      const output =
        await api.functional.mallPlatform.seller.productVariants.snapshots.at(
          ownerConnection,
          {
            productVariantId: targetVariantId,
          },
        );
      typia.assert(output);
    },
  );
  await TestValidator.httpError(
    "non-owner seller should not access variant snapshot history",
    [401, 403, 404],
    async () => {
      const output =
        await api.functional.mallPlatform.seller.productVariants.snapshots.at(
          intruderConnection,
          {
            productVariantId: targetVariantId,
          },
        );
      typia.assert(output);
    },
  );
}
