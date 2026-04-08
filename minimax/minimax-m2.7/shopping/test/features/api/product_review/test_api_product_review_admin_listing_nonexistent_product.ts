import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_review_admin_listing_nonexistent_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join request
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {});
  // 2. Authenticate as admin with the created account
  const authenticatedConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authenticatedConnection, {
    body: {
      email: adminAccount.email,
      password: "testpassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Generate a random non-existent UUID for productId
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call the admin products reviews endpoint with non-existent productId
  const response = await api.functional.ecommerceMall.admin.products.reviews.at(
    authenticatedConnection,
    {
      productId: nonExistentProductId,
    },
  );
  typia.assert(response!);
  // 5. Validate response has valid pagination structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.equals(
    "pagination.current is valid",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination.limit is valid",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination.records is valid",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination.pages is valid",
    typeof response.pagination.pages,
    "number",
  );
  // 6. Validate data array is empty (business rule: graceful handling of non-existent product)
  TestValidator.equals(
    "data array is empty for non-existent product",
    response.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", response.pagination.pages, 0);
}
