import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductDeletion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_deletion_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Filter deletion requests by status 'pending'
  const response =
    await api.functional.ecommerceMall.admin.product_deletions.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProductDeletion.IRequest,
      },
    );
  typia.assert(response);
  // Verify response structure
  TestValidator.predicate(
    "has pagination info",
    response.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // Verify all returned items have pending status
  TestValidator.predicate(
    "all items have pending status",
    response.data.every((item) => item.status === "pending"),
  );
  // Verify sorting - newest first
  if (response.data.length >= 2) {
    const timestamps = response.data.map((item) => item.created_at);
    for (let i = 0; i < timestamps.length - 1; i++) {
      TestValidator.predicate(
        `item ${i} >= item ${i + 1} in timestamp`,
        new Date(timestamps[i]) >= new Date(timestamps[i + 1]),
      );
    }
  }
}
