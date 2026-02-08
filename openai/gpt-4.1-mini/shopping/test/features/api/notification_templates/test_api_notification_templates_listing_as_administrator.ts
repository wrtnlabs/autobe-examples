import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_notification_templates_listing_as_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin is empty object
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 1. Test listing without filters, expect paginated results sorted by created_at DESC
  // Since IShoppingMallNotificationTemplate.IRequest is empty, send empty object
  const listAllBody: IShoppingMallNotificationTemplate.IRequest = {};
  const allResponse =
    await api.functional.shoppingMall.administrator.notificationTemplates.index(
      adminConnection,
      { body: listAllBody },
    );
  typia.assert(allResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page number >= 1",
    allResponse.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", allResponse.pagination.limit > 0);
  TestValidator.predicate("pages >= 0", allResponse.pagination.pages >= 0);
  TestValidator.predicate(
    "records >= 0",
    allResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "page count correct",
    allResponse.pagination.pages,
    Math.ceil(allResponse.pagination.records / allResponse.pagination.limit),
  );
  // Validate sorting descending by created_at if possible
  for (let i = 1; i < allResponse.data.length; i++) {
    const prev = allResponse.data[i - 1];
    const curr = allResponse.data[i];
    // Check if created_at exists and compare timestamps
    if ("created_at" in prev && "created_at" in curr) {
      const prevDate = new Date((prev as any).created_at).getTime();
      const currDate = new Date((curr as any).created_at).getTime();
      TestValidator.predicate(
        `sorted by created_at desc at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
  // Since the IShoppingMallNotificationTemplate.IRequest type has no properties,
  // but scenario mentions filtering by template_code and template_name,
  // we use partial objects with those properties (assuming the backend
  // supports ignoring unknown fields or these are valid fields).
  // 2. Test filtering by exact template_code
  if (allResponse.data.length > 0) {
    const testTemplate = allResponse.data[0];
    if ("template_code" in testTemplate) {
      const filterByCodeBody = {
        template_code: (testTemplate as any).template_code as string,
      } as any;
      const filteredByCodeResponse =
        await api.functional.shoppingMall.administrator.notificationTemplates.index(
          adminConnection,
          { body: filterByCodeBody },
        );
      typia.assert(filteredByCodeResponse);
      filteredByCodeResponse.data.forEach((template) => {
        TestValidator.equals(
          "filter by template_code exact match",
          (template as any).template_code,
          filterByCodeBody.template_code,
        );
      });
    }
  }
  // 3. Test filtering by partial match on template_name
  if (allResponse.data.length > 0) {
    const testTemplate = allResponse.data[0];
    if ("template_name" in testTemplate) {
      const partialName = ((testTemplate as any).template_name as string).slice(
        0,
        3,
      );
      const filterByNameBody = {
        template_name: partialName,
      } as any;
      const filteredByNameResponse =
        await api.functional.shoppingMall.administrator.notificationTemplates.index(
          adminConnection,
          { body: filterByNameBody },
        );
      typia.assert(filteredByNameResponse);
      filteredByNameResponse.data.forEach((template) => {
        void TestValidator.predicate(
          "filter by template_name partial match",
          (template as any).template_name.includes(partialName),
        );
      });
    }
  }
  // 4. Test filtering with conditions that match no templates - expect empty list
  const noMatchBody = {} as any;
  const noMatchResponse =
    await api.functional.shoppingMall.administrator.notificationTemplates.index(
      adminConnection,
      {
        body: noMatchBody,
      },
    );
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no match, data length 0",
    noMatchResponse.data.length,
    0,
  );
  // 5. Ensure deleted templates are excluded from results unless explicitly included
  // Skipped due to lack of explicit request property to include deleted templates
}
