import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProductRatingStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductRatingStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_rating_statistics_product_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Submit admin request (dependency)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason:
        "Need admin access for testing rating statistics endpoint behavior with non-existent products",
      href: "https://example.com/admin",
      referrer: "https://example.com/",
    },
  });
  // 2. Authenticate as admin using utility function
  const authenticatedConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authenticatedConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/",
    },
  });
  // 3. Generate a non-existent product UUID
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve rating statistics for non-existent product
  // 5. Validate HTTP 404 error is returned
  await TestValidator.httpError(
    "product not found returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.products.rating_statistics.ratingStatistics(
        authenticatedConnection,
        {
          productId: nonExistentProductId,
        },
      ),
  );
}
