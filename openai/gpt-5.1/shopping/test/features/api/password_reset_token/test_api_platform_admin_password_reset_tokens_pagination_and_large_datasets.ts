import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPasswordResetToken";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordResetToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate pagination and ordering behavior for platform-admin search of
 * password reset tokens.
 *
 * Business goal: Ensure that the platform-admin endpoint for searching password
 * reset tokens for a specific auth credentials record supports stable
 * pagination and ordering over potentially large datasets, and that the paging
 * metadata is consistent with the returned data.
 *
 * Scenario implemented (slightly adapted to match available APIs):
 *
 * 1. Register a platform administrator using POST /auth/platformAdmin/join.
 *
 *    - This provides a realistic authenticated context and ensures the Authorization
 *         header is set via the SDK.
 * 2. Use PATCH
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/passwordResetTokens
 *    multiple times with the same randomly generated authCredentialsId to
 *    simulate listing a large token history set.
 *
 *    - Although we do not have an API to create or resolve a real authCredentialsId,
 *         the SDK and typia guarantees that the response structure and
 *         pagination metadata match the DTO contract, so we can validate
 *         pagination shape, non-overlap, and sort behavior using random data.
 * 3. Request three pages with the same authCredentialsId and different parameters:
 *
 *    - Page 1: page = 1, limit = 10, sortBy = "created_at", sortDirection = "desc".
 *    - Page 2: page = 2, limit = 10, same sort settings.
 *    - Far page: page = 1000, limit = 10, same sort settings.
 * 4. Validate the following:
 *
 *    - Every response matches IPageIShoppingMallPasswordResetToken.ISummary via
 *         typia.assert, so pagination and data structures are correct.
 *    - Pagination.limit equals the requested limit (10) or at least is positive, and
 *         pagination.current is consistent with the requested page index
 *         (0-based vs 1-based behavior is checked logically).
 *    - For page 1 and page 2:
 *
 *         - If both data arrays are non-empty, collect their token IDs and assert there
 *                   is no overlap between pages.
 *         - All tokens share the same authCredentialsId in their `authCredentials.id`
 *                   field, ensuring correct scoping by path parameter.
 *         - Within each page, created_at values are ordered monotonically according to
 *                   sortDirection (non-increasing for desc).
 *    - For the far-out page (page 1000): when pagination.pages is less than 1000,
 *         the data array should be empty, confirming correct handling of
 *         out-of-range pages.
 */
export async function test_api_platform_admin_password_reset_tokens_pagination_and_large_datasets(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Use a random UUID as the authCredentialsId for pagination tests.
  const authCredentialsId = typia.random<string & tags.Format<"uuid">>();

  // Common request part for body.
  const baseRequestBody = {
    sortBy: "created_at",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallPasswordResetToken.IRequest;

  // Helper to request a specific page with a given limit.
  const fetchPage = async (
    page: number,
    limit: number,
  ): Promise<IPageIShoppingMallPasswordResetToken.ISummary> => {
    const body = {
      ...baseRequestBody,
      page,
      limit,
    } satisfies IShoppingMallPasswordResetToken.IRequest;

    const pageResult =
      await api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index(
        connection,
        {
          authCredentialsId,
          body,
        },
      );
    typia.assert<IPageIShoppingMallPasswordResetToken.ISummary>(pageResult);
    return pageResult;
  };

  // 3. Request page 1 and page 2 with the same limit and sort parameters.
  const limit = 10;
  const page1 = await fetchPage(1, limit);
  const page2 = await fetchPage(2, limit);

  // 4. Basic pagination metadata validation.
  TestValidator.predicate(
    "page1 pagination.limit should be positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "page2 pagination.limit should be positive",
    page2.pagination.limit > 0,
  );

  TestValidator.predicate(
    "page1 pagination.records should be non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page2 pagination.records should be non-negative",
    page2.pagination.records >= 0,
  );

  TestValidator.predicate(
    "page1 pagination.pages should be non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page2 pagination.pages should be non-negative",
    page2.pagination.pages >= 0,
  );

  // The backend uses 0-based current index; requested page is 1-based.
  TestValidator.equals(
    "page1.pagination.current should be 0 for page=1",
    page1.pagination.current,
    0,
  );
  TestValidator.equals(
    "page2.pagination.current should be 1 for page=2",
    page2.pagination.current,
    1,
  );

  // 5. When there is enough data, page1 should have at most `limit` items.
  TestValidator.predicate(
    "page1 data length should not exceed limit",
    page1.data.length <= limit,
  );
  TestValidator.predicate(
    "page2 data length should not exceed limit",
    page2.data.length <= limit,
  );

  // 6. If both pages have data, ensure IDs are distinct between pages
  //    and that all entries share the same authCredentialsId.
  if (page1.data.length > 0 && page2.data.length > 0) {
    const ids1 = page1.data.map((t) => t.id);
    const ids2 = page2.data.map((t) => t.id);

    // Distinct pages should not share token IDs.
    const intersection = ids1.filter((id) => ids2.includes(id));
    TestValidator.equals(
      "page1 and page2 should have no overlapping token IDs",
      intersection.length,
      0,
    );

    // All tokens must be scoped to the same authCredentialsId.
    TestValidator.predicate(
      "all page1 tokens should match authCredentialsId in path",
      page1.data.every(
        (token) => token.authCredentials.id === authCredentialsId,
      ),
    );
    TestValidator.predicate(
      "all page2 tokens should match authCredentialsId in path",
      page2.data.every(
        (token) => token.authCredentials.id === authCredentialsId,
      ),
    );

    // 7. Validate ordering by created_at with desc direction within each page.
    const isNonIncreasing = (
      items: IShoppingMallPasswordResetToken.ISummary[],
    ): boolean => {
      for (let i = 1; i < items.length; i++) {
        if (items[i - 1].created_at < items[i].created_at) {
          return false;
        }
      }
      return true;
    };

    TestValidator.predicate(
      "page1 tokens should be ordered by created_at desc",
      isNonIncreasing(page1.data),
    );
    TestValidator.predicate(
      "page2 tokens should be ordered by created_at desc",
      isNonIncreasing(page2.data),
    );
  }

  // 8. Request a far-out page to verify behavior when page exceeds total pages.
  const farPageIndex = 1000;
  const farPage = await fetchPage(farPageIndex, limit);

  TestValidator.predicate(
    "far page pagination.pages should be non-negative",
    farPage.pagination.pages >= 0,
  );

  if (farPage.pagination.pages <= farPageIndex) {
    TestValidator.equals(
      "when requesting beyond total pages, data should be empty",
      farPage.data.length,
      0,
    );
  }

  // 9. Make an additional call with ascending sort to verify ordering behavior.
  const ascBody = {
    page: 1,
    limit,
    sortBy: "created_at",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallPasswordResetToken.IRequest;

  const ascPage =
    await api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index(
      connection,
      {
        authCredentialsId,
        body: ascBody,
      },
    );
  typia.assert<IPageIShoppingMallPasswordResetToken.ISummary>(ascPage);

  if (ascPage.data.length > 1) {
    const isNonDecreasing = (
      items: IShoppingMallPasswordResetToken.ISummary[],
    ): boolean => {
      for (let i = 1; i < items.length; i++) {
        if (items[i - 1].created_at > items[i].created_at) {
          return false;
        }
      }
      return true;
    };

    TestValidator.predicate(
      "asc page tokens should be ordered by created_at asc",
      isNonDecreasing(ascPage.data),
    );
  }
}
