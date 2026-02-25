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

export async function test_api_email_template_creation_with_unique_code(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator authentication session
  const superAdminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create first email template with unique code
  const templateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    category: "notification",
    subject: RandomGenerator.paragraph({ sentences: 1 }),
    html_content: RandomGenerator.paragraph({ sentences: 3 }),
    text_content: RandomGenerator.paragraph({ sentences: 3 }),
    description: "Test email template for notifications",
    is_active: true,
  } satisfies IEcommerceEmailTemplate.ICreate;
  const template =
    await api.functional.ecommerce.superAdministrator.email_templates.create(
      superAdminConnection,
      { body: templateBody },
    );
  typia.assert(template);
  // Validate system-generated fields
  TestValidator.predicate(
    "template ID is UUID format",
    /^[0-9a-f-]{36}$/i.test(template.id),
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(Date.parse(template.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    !isNaN(Date.parse(template.updated_at)),
  );
  TestValidator.equals("version starts at 1", template.version, 1);
  // Validate input fields match output
  TestValidator.equals("code matches input", template.code, templateBody.code);
  TestValidator.equals("name matches input", template.name, templateBody.name);
  TestValidator.equals(
    "category matches input",
    template.category,
    templateBody.category,
  );
  TestValidator.equals(
    "subject matches input",
    template.subject,
    templateBody.subject,
  );
  TestValidator.equals(
    "html_content matches input",
    template.html_content,
    templateBody.html_content,
  );
  TestValidator.equals(
    "text_content matches input",
    template.text_content,
    templateBody.text_content,
  );
  TestValidator.equals(
    "is_active matches input",
    template.is_active,
    templateBody.is_active,
  );
  // Test code uniqueness constraint - should fail when using same code
  await TestValidator.error("duplicate code should fail", async () => {
    await api.functional.ecommerce.superAdministrator.email_templates.create(
      superAdminConnection,
      { body: templateBody },
    );
  });
}
