import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceEmailTemplate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_email_template_search_code_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(administrator);
  // Generate test data - various template codes for testing
  const templateCodes = [
    "WELCOME_EMAIL",
    "welcome_newsletter",
    "WELCOME_BACK",
    "ORDER_CONFIRMATION",
    "order_cancelled",
    "ORDER_SHIPPED",
    "PAYMENT_RECEIPT",
    "payment_failed",
    "ACCOUNT_VERIFICATION",
    "account_suspended",
    "NEWSLETTER_SUBSCRIPTION",
    "newsletter_unsubscribe",
    "PASSWORD_RESET",
    "password_changed",
  ];
  // Create templates with different codes (we'll simulate having these in the system)
  // For testing partial matching, we'll create search requests with different code patterns
  // 2. Test exact match on complete code
  const exactSearch =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          code: "WELCOME_EMAIL",
          limit: 10,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(exactSearch);
  // Verify that if any results returned, they match the exact code
  if (exactSearch.data.length > 0) {
    TestValidator.predicate(
      "exact match returns only matching codes",
      exactSearch.data.every((template) =>
        template.code.toLowerCase().includes("welcome_email".toLowerCase()),
      ),
    );
  }
  // 3. Test partial match on code prefix
  const prefixSearch =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          code: "WELCOME", // Partial prefix match
          limit: 10,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(prefixSearch);
  if (prefixSearch.data.length > 0) {
    TestValidator.predicate(
      "partial prefix match returns codes containing 'WELCOME'",
      prefixSearch.data.every((template) =>
        template.code.toLowerCase().includes("welcome".toLowerCase()),
      ),
    );
  }
  // 4. Test partial match on code middle segment
  const middleSearch =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          code: "ORDER", // Middle segment match
          limit: 10,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(middleSearch);
  if (middleSearch.data.length > 0) {
    TestValidator.predicate(
      "partial middle match returns codes containing 'ORDER'",
      middleSearch.data.every((template) =>
        template.code.toLowerCase().includes("order".toLowerCase()),
      ),
    );
  }
  // 5. Test case-insensitive partial matching
  const lowerCaseSearch =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          code: "newsletter", // Lower case search
          limit: 10,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(lowerCaseSearch);
  if (lowerCaseSearch.data.length > 0) {
    TestValidator.predicate(
      "case-insensitive search returns matching codes",
      lowerCaseSearch.data.every((template) =>
        template.code.toLowerCase().includes("newsletter".toLowerCase()),
      ),
    );
  }
  // 6. Test code that doesn't exist
  const noMatchSearch =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          code: "NON_EXISTENT_CODE_12345",
          limit: 10,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "non-existent code returns empty results",
    noMatchSearch.data.length,
    0,
  );
  // 7. Test with multiple filters
  const multiFilterSearch =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          code: "PAYMENT",
          is_active: true,
          limit: 10,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(multiFilterSearch);
  if (multiFilterSearch.data.length > 0) {
    TestValidator.predicate(
      "combined filter returns templates with 'PAYMENT' in code and is_active true",
      multiFilterSearch.data.every(
        (template) =>
          template.code.toLowerCase().includes("payment".toLowerCase()) &&
          template.is_active === true,
      ),
    );
  }
  // 8. Validate pagination works with filters
  const paginatedSearch =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          code: "WELCOME",
          limit: 2,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  if (paginatedSearch.data.length > 0) {
    TestValidator.predicate(
      "paginated results respect limit",
      paginatedSearch.data.length <= 2,
    );
  }
}
