import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies administrator snapshot-variant access is constrained to the correct product snapshot lineage.
 *
 * This test authenticates an administrator and exercises the historical variant listing endpoint with intentionally unrelated product and snapshot identifiers. The goal is to confirm that preserved variant history cannot be accessed outside the correct snapshot scope and that unrelated historical rows are not exposed to the caller.
 *
 * The scenario covers the access-control boundary for preserved variant history when the supplied product and snapshot identifiers do not represent a valid lineage pair. It accepts either a hard rejection or an empty preserved-history response, but it must never reveal unrelated variant snapshot data.
 */
export async function test_api_product_snapshot_variants_snapshot_scope_protection(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  try {
    const response =
      await api.functional.mallPlatform.administrator.products.snapshots.variants.index(
        adminConnection,
        {
          productId,
          snapshotId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductSnapshotVariant.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "unrelated product snapshot pair should not leak preserved variant history",
      response.data.length,
      0,
    );
  } catch (exp: unknown) {
    if (
      typeof exp !== "object" ||
      exp === null ||
      !("status" in exp) ||
      typeof (exp as { status: unknown }).status !== "number"
    )
      throw exp;
    const status = (exp as { status: number }).status;
    TestValidator.predicate(
      "mismatched snapshot lineage should be rejected with a forbidden or not-found error",
      status === 403 || status === 404,
    );
  }
}
