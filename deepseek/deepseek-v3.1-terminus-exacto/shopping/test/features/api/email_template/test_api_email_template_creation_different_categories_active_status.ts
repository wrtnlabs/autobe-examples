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
import { generate_random_ecommerce_super_administrator_email_templates_create } from "../../../generate/generate_random_ecommerce_super_administrator_email_templates_create";
import { prepare_random_ecommerce_email_template } from "../../../prepare/prepare_random_ecommerce_email_template";

export async function test_api_email_template_creation_different_categories_active_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  const categories = [
    "registration",
    "order_status",
    "password_reset",
    "seller_approval",
    "administrative_alert",
  ] as const;
  const activeStatuses = [true, false];
  const templates: IEcommerceEmailTemplate[] = [];
  // Test creation for each category with varying active status
  for (const category of categories) {
    for (const isActive of activeStatuses) {
      const createBody = {
        code: `email_${category}_${isActive}_${RandomGenerator.alphabets(8)}`,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Template ${isActive ? "Active" : "Inactive"}`,
        category,
        subject: `Important: ${category.replace("_", " ").toUpperCase()} Notification`,
        html_content: `<html><body><h1>${category.replace("_", " ")} Content</h1><p>Rich HTML formatting with <strong>bold</strong> and <em>emphasis</em>. Supports branding.</p></body></html>`,
        text_content: `${category.replace("_", " ")} Content\nPlain text fallback for email clients that do not support HTML rendering.`,
        description: isActive
          ? `Active template for ${category} notifications. Use when sending ${category} emails.`
          : null,
        is_active: isActive,
      } satisfies IEcommerceEmailTemplate.ICreate;
      const template =
        await api.functional.ecommerce.superAdministrator.email_templates.create(
          superAdminConnection,
          { body: createBody },
        );
      typia.assert(template);
      templates.push(template);
      // Validate created template matches input
      TestValidator.equals(
        `code matches for ${category} ${isActive}`,
        template.code,
        createBody.code,
      );
      TestValidator.equals(
        `name matches for ${category} ${isActive}`,
        template.name,
        createBody.name,
      );
      TestValidator.equals(
        `category matches for ${category} ${isActive}`,
        template.category,
        createBody.category,
      );
      TestValidator.equals(
        `subject matches for ${category} ${isActive}`,
        template.subject,
        createBody.subject,
      );
      TestValidator.equals(
        `html_content matches for ${category} ${isActive}`,
        template.html_content,
        createBody.html_content,
      );
      TestValidator.equals(
        `text_content matches for ${category} ${isActive}`,
        template.text_content,
        createBody.text_content,
      );
      TestValidator.equals(
        `description matches for ${category} ${isActive}`,
        template.description,
        createBody.description,
      );
      TestValidator.equals(
        `is_active matches for ${category} ${isActive}`,
        template.is_active,
        createBody.is_active,
      );
      TestValidator.predicate(
        `has id for ${category} ${isActive}`,
        template.id.length > 0,
      );
      TestValidator.predicate(
        `version is 1 for ${category} ${isActive}`,
        template.version === 1,
      );
      TestValidator.predicate(
        `created_at exists for ${category} ${isActive}`,
        template.created_at.length > 0,
      );
      TestValidator.predicate(
        `updated_at exists for ${category} ${isActive}`,
        template.updated_at.length > 0,
      );
      TestValidator.equals(
        `deleted_at is null for ${category} ${isActive}`,
        template.deleted_at,
        null,
      );
    }
  }
  // Ensure all templates have unique IDs
  const uniqueIds = new Set(templates.map((t) => t.id));
  TestValidator.equals(
    "all template IDs are unique",
    uniqueIds.size,
    templates.length,
  );
  // Ensure categories are as defined
  const usedCategories = templates.map((t) => t.category);
  TestValidator.equals(
    "categories match expected values",
    Array.from(new Set(usedCategories)).sort(),
    [...categories].sort(),
  );
  // Ensure version always starts at 1
  const allVersionsOne = templates.every((t) => t.version === 1);
  TestValidator.predicate("all templates have version 1", allVersionsOne);
  // Ensure active/inactive distribution
  const activeCount = templates.filter((t) => t.is_active).length;
  const inactiveCount = templates.filter((t) => !t.is_active).length;
  TestValidator.equals(
    "active templates count",
    activeCount,
    categories.length,
  );
  TestValidator.equals(
    "inactive templates count",
    inactiveCount,
    categories.length,
  );
}
