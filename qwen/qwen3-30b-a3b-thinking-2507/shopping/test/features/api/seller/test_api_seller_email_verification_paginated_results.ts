import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_email_verification_paginated_results(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller account using the utility function
  const sellerConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceSeller.IJoin,
  });
  // Use the sellerConnection that's been authorized
  // The authorization function automatically sets the Authorization header
  // Create multiple email verification records
  const numTokens = 25;
  await ArrayUtil.asyncRepeat(numTokens, async () => {
    await api.functional.ecommerce.seller.seller_email_verifications.index(
      sellerConnection,
      {
        body: {
          pageSize: 1,
        },
      },
    );
  });
  // Verify first page
  const firstPage =
    await api.functional.ecommerce.seller.seller_email_verifications.index(
      sellerConnection,
      {
        body: {
          pageSize: 10,
        },
      },
    );
  typia.assert(firstPage);
  // Verify pagination metadata
  TestValidator.equals(
    "First page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "Total record count should be 25",
    firstPage.pagination.records,
    25,
  );
  TestValidator.equals(
    "Total pages should be 3",
    firstPage.pagination.pages,
    3,
  );
  // Get the next cursor - use last item's id as cursor for next page
  const nextPageCursor = firstPage.data[firstPage.data.length - 1].id;
  TestValidator.notEquals(
    "Next page token should not be null",
    nextPageCursor,
    null,
  );
  // Verify second page using the cursor
  const secondPage =
    await api.functional.ecommerce.seller.seller_email_verifications.index(
      sellerConnection,
      {
        body: {
          pageSize: 10,
          cursor: nextPageCursor,
        },
      },
    );
  typia.assert(secondPage);
  // Verify second page metadata
  TestValidator.equals(
    "Second page should be 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "Second page should have 10 items",
    secondPage.data.length,
    10,
  );
  // Verify data continuity between pages
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.equals(
      "Last token from first page should match first token from second page",
      firstPage.data[firstPage.data.length - 1].id,
      secondPage.data[0].id,
    );
  }
}
