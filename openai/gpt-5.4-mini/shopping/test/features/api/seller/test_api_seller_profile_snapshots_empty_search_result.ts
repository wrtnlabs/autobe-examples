import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_empty_search_result(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller profile snapshot history search returns an empty valid page.
   *
   * Verifies that searching seller profile snapshots with a term that matches no
   * accessible records returns a paginated response with an empty data array and
   * correct pagination metadata. The test also confirms the operation is read-only
   * by repeating the same request and ensuring the results remain unchanged.
   *
   * 1. Authenticate as a seller through the dedicated join helper.
   * 2. Call the seller profile snapshot history endpoint with a guaranteed
   *    non-matching search term.
   * 3. Validate that the result contains no snapshot records and valid pagination
   *    metadata.
   * 4. Repeat the query to confirm the empty result is stable and side-effect free.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphabets(12)}@test.com`;
  const sellerPassword = `${RandomGenerator.alphabets(12)}!1`;
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const request: IMallPlatformSellerProfileSnapshot.IRequest = {
    search: RandomGenerator.alphabets(32),
    page: 1,
    limit: 10,
  };
  const output: IPageIMallPlatformSellerProfileSnapshot.ISummary =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.index(
      sellerConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals("empty snapshot result data", output.data, []);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.equals("pagination record count", output.pagination.records, 0);
  TestValidator.equals("pagination page count", output.pagination.pages, 0);
  const repeated: IPageIMallPlatformSellerProfileSnapshot.ISummary =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.index(
      sellerConnection,
      {
        body: request,
      },
    );
  typia.assert(repeated);
  TestValidator.equals("repeat query data remains empty", repeated.data, []);
  TestValidator.equals(
    "repeat query pagination remains identical",
    repeated.pagination,
    output.pagination,
  );
}
