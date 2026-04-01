import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_snapshot_options_retrieve_own_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.mallPlatform.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: `seller_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
        password: "Password1234!" as string & tags.Format<"password">,
        href: "https://example.com/register" as string & tags.Format<"uri">,
        referrer: "https://example.com" as string & tags.Format<"uri">,
        ip: "127.0.0.1" as string & tags.Format<"ipv4">,
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(seller);
  const output =
    await api.functional.mallPlatform.seller.products.variantSnapshots.options.create(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate("option row id is present", output.id.length > 0);
  TestValidator.predicate(
    "option row references a snapshot",
    output.mallPlatformProductVariantSnapshotId.length > 0,
  );
  TestValidator.predicate("option key is present", output.optionKey.length > 0);
  TestValidator.predicate(
    "option value is present",
    output.optionValue.length > 0,
  );
}
