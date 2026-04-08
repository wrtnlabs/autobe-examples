import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_search_with_approval_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create multiple sellers with pending approval status
  const sellerEmails: string[] = [];
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1);
  sellerEmails.push(seller1.email);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2);
  sellerEmails.push(seller2.email);
  // Step 3: Search for sellers with pending approval status using admin connection
  const response = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approvalStatus: "pending",
        pageSize: 20,
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(response);
  // Step 4-5: Validate pagination fields are populated correctly
  // typia.assert already validates structure and types
  // Verify pagination shows reasonable values
  TestValidator.predicate(
    "pagination records >= created seller count",
    response.pagination.records >= sellerEmails.length,
  );
  // Step 6: Verify each seller has approvalStatus='pending' and derived fields are populated
  for (const seller of response.data) {
    TestValidator.equals(
      "seller approvalStatus is 'pending'",
      seller.approvalStatus,
      "pending",
    );
    TestValidator.predicate(
      "seller has registrationCount >= 0",
      seller.registrationCount >= 0,
    );
    TestValidator.predicate(
      "seller has latestRegistrationStatus",
      seller.latestRegistrationStatus !== null,
    );
  }
  // Verify our created sellers are included in results
  const foundEmails = response.data
    .map((s) => s.email)
    .filter((email) => sellerEmails.includes(email));
  TestValidator.predicate(
    "at least one created seller found in pending results",
    foundEmails.length > 0,
  );
}