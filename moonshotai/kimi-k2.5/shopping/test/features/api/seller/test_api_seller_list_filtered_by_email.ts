import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_list_filtered_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test email filter with substring matching
  const substringSearch = "seller";
  const substringResult = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        email: substringSearch,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(substringResult);
  // Verify returned sellers contain the email substring (case-insensitive)
  if (substringResult.data.length > 0) {
    TestValidator.predicate(
      "all sellers contain email substring",
      substringResult.data.every((seller) =>
        seller.email.toLowerCase().includes(substringSearch.toLowerCase()),
      ),
    );
  }
  // 3. Test email filter with exact match pattern
  const exactResult = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        email: "admin@example.com",
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(exactResult);
  TestValidator.predicate(
    "pagination valid for exact match",
    exactResult.pagination.current === 1 && exactResult.pagination.limit === 5,
  );
  // 4. Test combined email filter with pagination (page 2)
  const page2Result = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        email: "shop",
        page: 2,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("current page is 2", page2Result.pagination.current, 2);
  TestValidator.equals("limit is 20", page2Result.pagination.limit, 20);
  TestValidator.predicate(
    "records count consistent with pages",
    page2Result.pagination.records >= page2Result.data.length,
  );
  // 5. Test null email filter (no filtering)
  const noFilterResult = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        email: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(noFilterResult);
  // 6. Test prefix matching pattern
  const prefixResult = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        email: "admin",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(prefixResult);
  // 7. Test suffix matching pattern (domain)
  const suffixResult = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        email: "@gmail.com",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(suffixResult);
}
