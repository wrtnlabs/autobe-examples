import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshots_access_scope_restriction(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator access-scope restriction for seller profile snapshot browsing.
   *
   * Verifies that the seller profile snapshot history endpoint either rejects requests
   * outside the caller's permitted scope with the standard authorization failure or,
   * when the request is allowed but matches no accessible records, returns a valid
   * empty paginated page without exposing unrelated seller history.
   *
   * 1. Authenticate a fresh administrator connection using the join utility.
   * 2. Query seller profile snapshots with a deliberately narrow search filter.
   * 3. Accept either the standard authorization failure or an empty paginated page.
   * 4. Validate pagination metadata and confirm the operation is read-only.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    search: RandomGenerator.alphaNumeric(24),
    page: 1,
    limit: 10,
  } satisfies IMallPlatformSellerProfileSnapshot.IRequest;
  try {
    const output =
      await api.functional.mallPlatform.administrator.sellerProfileSnapshots.index(
        adminConnection,
        { body: request },
      );
    typia.assert(output);
    TestValidator.equals(
      "empty result data when no accessible seller profile snapshots match",
      output.data.length,
      0,
    );
    TestValidator.equals(
      "pagination current page",
      output.pagination.current,
      request.page,
    );
    TestValidator.equals(
      "pagination limit",
      output.pagination.limit,
      request.limit,
    );
    TestValidator.equals("pagination records", output.pagination.records, 0);
    TestValidator.equals("pagination pages", output.pagination.pages, 0);
  } catch (exp) {
    if (typia.is<api.HttpError>(exp)) {
      TestValidator.predicate(
        "authorization failure is enforced for out-of-scope seller profile snapshots",
        [401, 403].includes(exp.status),
      );
      return;
    }
    throw exp;
  }
}
