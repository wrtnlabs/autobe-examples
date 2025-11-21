import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_filter_by_active_true(
  connection: api.IConnection,
) {
  // Get all templates (unfiltered) to establish baseline
  const allTemplatesResult: IPageIShoppingMallNotificationTemplate.ISummary =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  typia.assert(allTemplatesResult);

  // Get only active templates
  const activeTemplatesResult: IPageIShoppingMallNotificationTemplate.ISummary =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          active: true,
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  typia.assert(activeTemplatesResult);

  // Get only inactive templates
  const inactiveTemplatesResult: IPageIShoppingMallNotificationTemplate.ISummary =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          active: false,
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  typia.assert(inactiveTemplatesResult);

  // Validate that active templates are a subset of all templates
  const allTemplateIds = new Set(allTemplatesResult.data);
  const activeTemplateIds = new Set(activeTemplatesResult.data);
  const inactiveTemplateIds = new Set(inactiveTemplatesResult.data);

  for (const id of activeTemplateIds) {
    TestValidator.predicate("active template is in all templates", () =>
      allTemplateIds.has(id),
    );
  }

  // Validate that inactive templates are a subset of all templates
  for (const id of inactiveTemplateIds) {
    TestValidator.predicate("inactive template is in all templates", () =>
      allTemplateIds.has(id),
    );
  }

  // Validate that active and inactive results are mutually exclusive
  for (const id of activeTemplateIds) {
    TestValidator.predicate(
      "no overlap between active and inactive",
      () => !inactiveTemplateIds.has(id),
    );
  }

  for (const id of inactiveTemplateIds) {
    TestValidator.predicate(
      "no overlap between inactive and active",
      () => !activeTemplateIds.has(id),
    );
  }

  // Validate pagination is consistent
  TestValidator.equals(
    "total records in active results",
    activeTemplatesResult.pagination.records,
    activeTemplatesResult.data.length,
  );
  TestValidator.equals(
    "total records in inactive results",
    inactiveTemplatesResult.pagination.records,
    inactiveTemplatesResult.data.length,
  );
  TestValidator.equals(
    "total records in all results",
    allTemplatesResult.pagination.records,
    allTemplatesResult.data.length,
  );

  // Validate total count
  TestValidator.equals(
    "total records in all should equal sum of active and inactive",
    allTemplatesResult.pagination.records,
    activeTemplatesResult.pagination.records +
      inactiveTemplatesResult.pagination.records,
  );
}
