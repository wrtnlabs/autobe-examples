import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentVaultEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentVaultEntry";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentVaultEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntry";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_vault_entries_admin_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account with proper permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Search for payment vault entries with pagination
  // Since we cannot create test entries (no create API available),
  // we must test the search functionality with default parameters
  const searchResult: IPageIShoppingMallPaymentVaultEntry.ISummary =
    await api.functional.shoppingMall.admin.payment_vault_entries.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPaymentVaultEntry.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 3: Validate pagination structure and types
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => searchResult.pagination.pages >= 0,
  );
  // Step 4: Validate data structure and masking
  TestValidator.predicate("data array exists", () =>
    Array.isArray(searchResult.data),
  );
  // Validate data is properly structured as ISummary
  for (const entry of searchResult.data) {
    // Entry must have required properties from ISummary
    TestValidator.equals("entry id format", typeof entry.id, "string");
    TestValidator.predicate("entry id is uuid", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        entry.id,
      ),
    );
    TestValidator.equals(
      "entry customer_id format",
      typeof entry.customer_id,
      "string",
    );
    TestValidator.predicate("entry customer_id is uuid", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        entry.customer_id,
      ),
    );
    TestValidator.equals(
      "entry payment_method_type",
      typeof entry.payment_method_type,
      "string",
    );
    // Validate payment method type is one of the allowed values
    const validPaymentTypes = [
      "credit_card",
      "debit_card",
      "digital_wallet",
      "bank_account",
      "cryptocurrency",
    ];
    TestValidator.predicate("valid payment_method_type", () =>
      validPaymentTypes.includes(entry.payment_method_type),
    );
    TestValidator.equals(
      "entry last_four_digit format",
      typeof entry.last_four_digit,
      "string",
    );
    TestValidator.predicate("last_four_digit is 4 digits", () =>
      /^[0-9]{4}$/.test(entry.last_four_digit),
    );
    TestValidator.equals("entry brand format", typeof entry.brand, "string");
    TestValidator.predicate(
      "entry brand is not empty",
      () => entry.brand.length > 0,
    );
    TestValidator.equals(
      "entry is_default format",
      typeof entry.is_default,
      "boolean",
    );
    TestValidator.equals(
      "entry is_active format",
      typeof entry.is_active,
      "boolean",
    );
    TestValidator.equals(
      "entry created_at format",
      typeof entry.created_at,
      "string",
    );
    TestValidator.predicate("created_at is ISO date-time", () =>
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        entry.created_at,
      ),
    );
    TestValidator.equals(
      "entry storage_provider format",
      typeof entry.storage_provider,
      "string",
    );
    TestValidator.predicate(
      "storage_provider is not empty",
      () => entry.storage_provider.length > 0,
    );
    TestValidator.equals(
      "entry security_level format",
      typeof entry.security_level,
      "string",
    );
    const validSecurityLevels = ["low", "medium", "high"];
    TestValidator.predicate("valid security_level", () =>
      validSecurityLevels.includes(entry.security_level),
    );
    // last_used_at is optional and can be null or undefined
    TestValidator.predicate(
      "last_used_at is valid type",
      () =>
        entry.last_used_at === null ||
        entry.last_used_at === undefined ||
        (typeof entry.last_used_at === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
            entry.last_used_at,
          )),
    );
    // Validate sensitive data is properly masked - no full card numbers, tokens, CVV, etc.
    // According to ISummary description, only last_four_digit is visible
    // All other payment details are tokenized and masked
    // This is confirmed by the schema - no other payment details are in ISummary
  }
  // Step 5: Validate search response structure matches IPageIShoppingMallPaymentVaultEntry.ISummary
  TestValidator.equals(
    "response structure - keys",
    Object.keys(searchResult).sort(),
    ["pagination", "data"].sort(),
  );
  // Validate pagination structure matches IPage.IPagination
  TestValidator.equals(
    "pagination structure - keys",
    Object.keys(searchResult.pagination).sort(),
    ["current", "limit", "records", "pages"].sort(),
  );
  // Validate pagination numbers have correct constraints
  TestValidator.predicate(
    "pagination current is positive",
    () => searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    () =>
      searchResult.pagination.limit >= 1 &&
      searchResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    () => searchResult.pagination.pages >= 1,
  );
  // Validate data array has reasonable number of entries given pagination limits
  TestValidator.predicate(
    "data array length corresponds to limit (or less if no more entries)",
    () => searchResult.data.length >= 0 && searchResult.data.length <= 100,
  );
  // Confirm no sensitive data is exposed beyond what's specified in ISummary
  // The ISummary schema only exposes: id, customer_id, payment_method_type, last_four_digit, brand, is_default, is_active, created_at, storage_provider, security_level, last_used_at
  // Any additional fields would be a security failure
  const allowedFields = [
    "id",
    "customer_id",
    "payment_method_type",
    "last_four_digit",
    "brand",
    "is_default",
    "is_active",
    "created_at",
    "storage_provider",
    "security_level",
    "last_used_at",
  ];
  for (const entry of searchResult.data) {
    const entryKeys = Object.keys(entry).sort();
    TestValidator.equals(
      "entry has exact allowed properties",
      entryKeys,
      allowedFields,
    );
  }
}
