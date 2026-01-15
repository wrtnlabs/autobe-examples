import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSalesOrderNote";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_order_notes_retrieval_with_keyword_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Search for a keyword that doesn't exist in the system
  const nonExistentKeyword =
    "nonexistent_keyword_" + RandomGenerator.alphaNumeric(8);
  const searchResults =
    await api.functional.communityPlatform.admin.salesordernotes.index(
      adminConnection,
      {
        body: typia.assert<ICommunityPlatformSalesOrderNote.IRequest>({ 
          note: nonExistentKeyword,
          page: 1,
          limit: 10,
        }),
      },
    );
  typia.assert(searchResults);
  // Step 3: Validate the response structure follows IPageICommunityPlatformSalesOrderNote
  TestValidator.equals(
    "search results data array should be empty",
    searchResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    searchResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should be 0",
    searchResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    searchResults.pagination.pages,
    0,
  );
  // Verify that the response doesn't contain any note with the searched keyword (trivially true since data is empty)
  TestValidator.predicate(
    "no notes in result",
    searchResults.data.length === 0,
  );
}