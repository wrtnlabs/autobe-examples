import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_email_template_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as administrator using authorize_admin_join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Retrieve a specific email template by its known ID from the system
  // Note: This assumes a template with this ID exists in the database for testing
  const template: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.email.templates.at(
      adminConnection,
      {
        templateId: "123e4567-e89b-12d3-a456-426614174000",
      },
    );
  typia.assert(template);
  // Step 3: Validate that the template response contains all required properties with correct types and format constraints
  TestValidator.equals(
    "template has valid UUID",
    typeof template.id === "string" && template.id.length > 0,
    true,
  );
  TestValidator.equals(
    "template has non-empty template_key",
    template.template_key.length > 0,
    true,
  );
  TestValidator.equals(
    "template has valid name",
    template.name.length >= 1 && template.name.length <= 255,
    true,
  );
  TestValidator.equals(
    "template has valid subject",
    template.subject.length >= 1 && template.subject.length <= 500,
    true,
  );
  TestValidator.equals(
    "template has non-empty HTML body",
    template.body_html.length >= 1,
    true,
  );
  TestValidator.equals(
    "template has non-empty plain text body",
    template.body_text.length >= 1,
    true,
  );
  TestValidator.equals(
    "template has valid created_at timestamp",
    template.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "template has valid updated_at timestamp",
    template.updated_at.length > 0,
    true,
  );
  TestValidator.equals(
    "template has valid created_by UUID",
    typeof template.created_by === "string" && template.created_by.length > 0,
    true,
  );
  TestValidator.equals(
    "template has valid updated_by UUID",
    typeof template.updated_by === "string" && template.updated_by.length > 0,
    true,
  );
  TestValidator.equals(
    "template has valid version number",
    typeof template.version === "number" && template.version >= 1,
    true,
  );
  TestValidator.equals(
    "template has active status or undefined",
    template.is_active === true || template.is_active === undefined,
    true,
  );
  // Step 4: Validate that template variables are either undefined or an array of strings
  if (template.variables !== undefined) {
    TestValidator.predicate(
      "template variables is an array",
      Array.isArray(template.variables),
    );
    TestValidator.predicate(
      "template variables array is not empty",
      template.variables.length > 0,
    );
    for (const varName of template.variables) {
      TestValidator.equals(
        "each variable is a string",
        typeof varName === "string",
        true,
      );
    }
  }
}
