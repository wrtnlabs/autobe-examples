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

export async function test_api_email_template_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function to authorize administrator join
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(administrator);
  // Search email templates with default pagination (no filters)
  const searchResult =
    await api.functional.ecommerce.administrator.email_templates.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceEmailTemplate.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination structure exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", searchResult.pagination.limit >= 0);
  TestValidator.predicate(
    "total records is valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is valid",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(searchResult.data));
  // If there are templates, validate their structure
  if (searchResult.data.length > 0) {
    const template = searchResult.data[0];
    TestValidator.predicate("template has id", typeof template.id === "string");
    TestValidator.predicate(
      "template has code",
      typeof template.code === "string",
    );
    TestValidator.predicate(
      "template has name",
      typeof template.name === "string",
    );
    TestValidator.predicate(
      "template has category",
      typeof template.category === "string",
    );
    TestValidator.predicate(
      "template has is_active",
      typeof template.is_active === "boolean",
    );
    TestValidator.predicate(
      "template has version",
      typeof template.version === "number",
    );
    TestValidator.predicate(
      "template has created_at",
      typeof template.created_at === "string",
    );
    TestValidator.predicate(
      "template has updated_at",
      typeof template.updated_at === "string",
    );
  }
}
