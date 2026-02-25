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

/**
 * Test bulk creation of email templates with unique codes and validate code uniqueness constraint across system.
 */
export async function test_api_email_template_bulk_creation_and_code_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator session
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // Store created templates for validation
  const createdTemplates: IEcommerceEmailTemplate[] = [];
  // 2. Create multiple templates with unique codes in same category
  const category = "notification";
  const templateCount = 3;
  for (let i = 0; i < templateCount; i++) {
    const body = {
      code: `TEMPLATE_${RandomGenerator.alphaNumeric(8)}_${i}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      category,
      subject: `Test Subject ${i}`,
      html_content: `<p>HTML Content ${i}</p>`,
      text_content: `Text Content ${i}`,
      description:
        i === 0
          ? null
          : (`Description for template ${i}` satisfies string | null as
              | string
              | null),
      is_active: i % 2 === 0,
    } satisfies IEcommerceEmailTemplate.ICreate;
    const template =
      await api.functional.ecommerce.superAdministrator.email_templates.create(
        superAdminConnection,
        { body },
      );
    typia.assert(template);
    // Validate system fields
    TestValidator.predicate(
      "has uuid id",
      /^[0-9a-f-]{36}$/i.test(template.id),
    );
    TestValidator.predicate("has created_at", !!template.created_at);
    TestValidator.predicate("has updated_at", !!template.updated_at);
    TestValidator.equals(
      "deleted_at initially null",
      template.deleted_at,
      null,
    );
    TestValidator.equals("version starts at 1", template.version, 1);
    TestValidator.equals("code matches input", template.code, body.code);
    TestValidator.equals("category matches", template.category, body.category);
    TestValidator.equals(
      "is_active matches",
      template.is_active,
      body.is_active,
    );
    createdTemplates.push(template);
  }
  // 3. Verify all codes are unique
  const codes = createdTemplates.map((t) => t.code);
  const uniqueCodes = new Set(codes);
  TestValidator.equals("all codes are unique", codes.length, uniqueCodes.size);
  // 4. Attempt to create duplicate template with existing code
  const existingCode = createdTemplates[0].code;
  await TestValidator.error("duplicate code should fail", async () => {
    const duplicateBody = {
      code: existingCode,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      category: "duplicate",
      subject: "Duplicate Subject",
      html_content: "<p>Duplicate HTML</p>",
      text_content: "Duplicate Text",
      description: null satisfies string | null as string | null,
      is_active: true,
    } satisfies IEcommerceEmailTemplate.ICreate;
    await api.functional.ecommerce.superAdministrator.email_templates.create(
      superAdminConnection,
      { body: duplicateBody },
    );
  });
  // 5. Test edge cases
  // Long code name (within limits)
  const longCodeBody = {
    code: "A".repeat(50),
    name: "Long Code Test",
    category: "edge",
    subject: "Edge Case",
    html_content: "<p>Test</p>",
    text_content: "Test",
    description: null satisfies string | null as string | null,
    is_active: true,
  } satisfies IEcommerceEmailTemplate.ICreate;
  const longCodeTemplate =
    await api.functional.ecommerce.superAdministrator.email_templates.create(
      superAdminConnection,
      { body: longCodeBody },
    );
  typia.assert(longCodeTemplate);
  TestValidator.equals(
    "long code preserved",
    longCodeTemplate.code,
    longCodeBody.code,
  );
  // Special characters in code (if allowed)
  const specialCodeBody = {
    code: "template-code_123.test",
    name: "Special Chars",
    category: "edge",
    subject: "Special",
    html_content: "<p>Test</p>",
    text_content: "Test",
    description: null satisfies string | null as string | null,
    is_active: true,
  } satisfies IEcommerceEmailTemplate.ICreate;
  const specialCodeTemplate =
    await api.functional.ecommerce.superAdministrator.email_templates.create(
      superAdminConnection,
      { body: specialCodeBody },
    );
  typia.assert(specialCodeTemplate);
  TestValidator.equals(
    "special chars preserved",
    specialCodeTemplate.code,
    specialCodeBody.code,
  );
  // 6. Test empty category
  const emptyCategoryBody = {
    code: `EMPTY_CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: "Empty Category",
    category: "",
    subject: "Test",
    html_content: "<p>Test</p>",
    text_content: "Test",
    description: null satisfies string | null as string | null,
    is_active: true,
  } satisfies IEcommerceEmailTemplate.ICreate;
  const emptyCategoryTemplate =
    await api.functional.ecommerce.superAdministrator.email_templates.create(
      superAdminConnection,
      { body: emptyCategoryBody },
    );
  typia.assert(emptyCategoryTemplate);
  TestValidator.equals(
    "empty category preserved",
    emptyCategoryTemplate.category,
    "",
  );
}