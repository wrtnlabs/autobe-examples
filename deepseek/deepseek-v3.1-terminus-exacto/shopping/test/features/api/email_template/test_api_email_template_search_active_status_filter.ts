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

/**
 * Test filtering email templates by active/inactive status.
 *
 * Authenticate as administrator, then test searching for active templates only
 * and inactive templates only using the is_active filter. Validate that the
 * boolean filter correctly separates active from inactive templates. Test
 * edge cases including when no templates match the filter criteria.
 */
export async function test_api_email_template_search_active_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join endpoint
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  // Test searching for active templates only
  const activeTemplates =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          is_active: true,
          limit: 10,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(activeTemplates);
  // Validate all returned templates are active
  for (const template of activeTemplates.data) {
    TestValidator.equals("template should be active", template.is_active, true);
  }
  // Test searching for inactive templates only
  const inactiveTemplates =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          is_active: false,
          limit: 10,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(inactiveTemplates);
  // Validate all returned templates are inactive
  for (const template of inactiveTemplates.data) {
    TestValidator.equals(
      "template should be inactive",
      template.is_active,
      false,
    );
  }
  // Test edge case: searching with no filters should return mix of active and inactive
  const allTemplates =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(allTemplates);
  // Validate that we have both active and inactive templates in the unfiltered results
  const hasActive = allTemplates.data.some(
    (template) => template.is_active === true,
  );
  const hasInactive = allTemplates.data.some(
    (template) => template.is_active === false,
  );
  TestValidator.predicate(
    "should have active templates in unfiltered results",
    hasActive,
  );
  TestValidator.predicate(
    "should have inactive templates in unfiltered results",
    hasInactive,
  );
  // Test pagination information is correctly returned
  TestValidator.predicate(
    "pagination should have current page",
    allTemplates.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    allTemplates.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    allTemplates.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    allTemplates.pagination.pages >= 0,
  );
}
