import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_admin_paged_filter_scope(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator seller browsing with paged filtering and narrow scope selection.
   *
   * This test checks that an administrator can request a later page of the seller list with a restrictive lifecycle-state filter and search term, and that the endpoint returns only sellers inside the requested scope.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Request a later page with a narrow search and rejected-status filter.
   * 3. Validate pagination metadata and confirm every returned seller summary stays within scope.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email:
        `admin_${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
          typia.tags.Format<"email">,
      password: `P@ssw0rd_${RandomGenerator.alphaNumeric(8)}` satisfies string &
        typia.tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    page: 10,
    limit: 5,
    search: RandomGenerator.alphabets(3),
    status: "rejected",
  } satisfies IMallPlatformSeller.IRequest;
  const output = await api.functional.mallPlatform.administrator.sellers.index(
    adminConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "requested page should be preserved in pagination metadata when available",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "requested page size should be preserved in pagination metadata",
    output.pagination.limit,
    request.limit ?? output.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "result set should not exceed requested limit",
    output.data.length <= (request.limit ?? output.pagination.limit),
  );
  TestValidator.predicate(
    "every returned seller must match the requested rejected status",
    output.data.every((seller) => seller.status === request.status),
  );
  for (const seller of output.data) {
    TestValidator.predicate(
      "rejected sellers must include a rejection reason",
      seller.rejectionReason !== null && seller.rejectionReason.length > 0,
    );
    TestValidator.predicate(
      "returned seller summary must have stable identity and timestamps",
      seller.id.length > 0 &&
        seller.email.length > 0 &&
        seller.createdAt.length > 0 &&
        seller.updatedAt.length > 0,
    );
  }
  if (output.data.length === 0) {
    TestValidator.predicate(
      "empty pages should still report a valid pagination envelope",
      output.pagination.records >= 0 && output.pagination.pages >= 0,
    );
  }
}
