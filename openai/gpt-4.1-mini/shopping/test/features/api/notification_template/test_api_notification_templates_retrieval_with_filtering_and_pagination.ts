import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_notification_templates_retrieval_with_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  // Token is set internally by authorize_administrator_join
  // Scenario 1: Successful retrieval with filters and pagination
  {
    const filterSubstring = adminAuthorized.email.substring(0, 3);
    const requestBody: IShoppingMallNotificationTemplate.IRequest = {
      templateName: filterSubstring,
      page: 1,
      limit: 5,
      sortBy: "template_name",
      order: "asc",
    };
    const response =
      await api.functional.shoppingMall.administrator.notificationTemplates.index(
        adminConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Assert pagination metadata correctness
    TestValidator.predicate(
      "pagination current page >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit positive",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
    // Validate that all returned notification templates match filter on template_name
    for (const template of response.data) {
      typia.assert(template);
      TestValidator.predicate(
        `template_name includes filter substring '${filterSubstring}'`,
        template.template_name.includes(filterSubstring),
      );
      // Confirm required fields existence
      TestValidator.predicate(
        "template has id",
        typeof template.id === "string" && template.id.length > 0,
      );
      TestValidator.predicate(
        "template has template_code",
        typeof template.template_code === "string" &&
          template.template_code.length > 0,
      );
      TestValidator.predicate(
        "template has content",
        typeof template.content === "string" && template.content.length > 0,
      );
      TestValidator.predicate(
        "template timestamps are valid ISO date-time strings",
        () => {
          const createdAtValid =
            typeof template.created_at === "string" &&
            !isNaN(Date.parse(template.created_at));
          const updatedAtValid =
            typeof template.updated_at === "string" &&
            !isNaN(Date.parse(template.updated_at));
          const deletedAtValid =
            template.deleted_at === null ||
            (typeof template.deleted_at === "string" &&
              !isNaN(Date.parse(template.deleted_at)));
          return createdAtValid && updatedAtValid && deletedAtValid;
        },
      );
    }
  }
  // Scenario 2: Retrieval with no matching templates
  {
    const requestBody: IShoppingMallNotificationTemplate.IRequest = {
      templateName: RandomGenerator.alphaNumeric(20), // unlikely to match existing
      page: 1,
      limit: 10,
      sortBy: "created_at",
      order: "desc",
    };
    const response =
      await api.functional.shoppingMall.administrator.notificationTemplates.index(
        adminConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Assert that data array is empty array
    TestValidator.equals("empty data array", response.data, []);
    // Assert pagination metadata correctness
    TestValidator.predicate(
      "pagination current page >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit positive",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
  }
}
