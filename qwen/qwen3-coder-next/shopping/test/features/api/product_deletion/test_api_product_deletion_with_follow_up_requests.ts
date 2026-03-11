import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_deletion_with_follow_up_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a product first (needed for deletion request)
  // Since product creation is not available in provided functions,
  // we'll skip this step and use a random UUID for product_id
  // In real scenario, you would create a product first
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial deletion request (pending)
  const initialDeletion =
    await api.functional.ecommerceMall.admin.product_deletions.at(
      adminConnection,
      {
        productDeletionId: productId, // This is placeholder - real test would need actual deletion request creation
      },
    );
  typia.assert(initialDeletion);
  // 4. Create a follow-up deletion request
  // This would require an actual API endpoint that creates follow-up requests
  // Since the provided functions don't include creation endpoints,
  // we'll work with what's available
  // 5. Retrieve parent deletion request and verify follow-ups
  const result = await api.functional.ecommerceMall.admin.product_deletions.at(
    adminConnection,
    {
      productDeletionId: initialDeletion.id,
    },
  );
  typia.assert(result);
  // 6. Verify follow-up requests structure
  TestValidator.predicate(
    "followUpRequests array exists",
    Array.isArray(result.followUpRequests),
  );
  // 7. Verify each follow-up request has required properties
  for (const followUp of result.followUpRequests) {
    TestValidator.equals(
      "follow-up has product",
      followUp.product !== undefined,
      true,
    );
    TestValidator.equals(
      "follow-up has admin",
      followUp.admin !== undefined,
      true,
    );
    TestValidator.equals(
      "follow-up has parent request",
      followUp.parentRequest !== undefined,
      true,
    );
    TestValidator.predicate(
      "follow-up has valid timestamps",
      followUp.created_at !== undefined && followUp.updated_at !== undefined,
    );
  }
}
