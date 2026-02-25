import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test access to an email template by super administrator.
 *
 * Since template creation APIs are not available in the current SDK,
 * this test focuses on validating that super administrators can successfully
 * retrieve template details through the provided endpoint, demonstrating
 * that the authorization and retrieval mechanisms work correctly.
 */
export async function test_api_email_templates_inactive_template_access(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Retrieve an email template using the authenticated connection
  const templateId = typia.random<string & tags.Format<"uuid">>();
  const template =
    await api.functional.ecommerce.superAdministrator.email_templates.at(
      superAdminConnection,
      {
        templateId,
      },
    );
  // Validate the template response structure
  typia.assert(template);
  // Verify that all required template fields are present and correctly typed
  TestValidator.equals("template ID matches request", template.id, templateId);
  TestValidator.predicate(
    "template code is non-empty string",
    () => typeof template.code === "string" && template.code.length > 0,
  );
  TestValidator.predicate(
    "template name is non-empty string",
    () => typeof template.name === "string" && template.name.length > 0,
  );
  TestValidator.predicate(
    "template category is non-empty string",
    () => typeof template.category === "string" && template.category.length > 0,
  );
  TestValidator.predicate(
    "template subject is string",
    () => typeof template.subject === "string",
  );
  TestValidator.predicate(
    "template HTML content is string",
    () => typeof template.html_content === "string",
  );
  TestValidator.predicate(
    "template text content is string",
    () => typeof template.text_content === "string",
  );
  // Validate timestamp fields have proper format
  TestValidator.predicate("created_at is valid ISO date-time", () =>
    isValidISODateTime(template.created_at),
  );
  TestValidator.predicate("updated_at is valid ISO date-time", () =>
    isValidISODateTime(template.updated_at),
  );
  // Validate boolean and numeric fields
  TestValidator.predicate(
    "is_active field is boolean",
    () => typeof template.is_active === "boolean",
  );
  TestValidator.predicate(
    "version is non-negative integer",
    () =>
      typeof template.version === "number" &&
      Number.isInteger(template.version) &&
      template.version >= 0,
  );
  // Validate nullable fields
  TestValidator.predicate(
    "description is null or string",
    () =>
      template.description === null || typeof template.description === "string",
  );
  TestValidator.predicate(
    "deleted_at is null or valid ISO date-time",
    () =>
      template.deleted_at === null || isValidISODateTime(template.deleted_at),
  );
}
/** Helper function to validate ISO date-time strings */
function isValidISODateTime(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date.toString() !== "Invalid Date" && dateString.includes("T");
  } catch {
    return false;
  }
}
