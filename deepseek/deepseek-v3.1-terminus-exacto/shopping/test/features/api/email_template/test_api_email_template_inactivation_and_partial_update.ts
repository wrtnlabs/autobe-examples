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

export async function test_api_email_template_inactivation_and_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using utility function
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
  // 2. Create template data and preserve original values for comparison
  const templateCreateData = {
    code: typia.random<string & tags.MinLength<1>>(),
    name: typia.random<string & tags.MinLength<1>>(),
    category: typia.random<string & tags.MinLength<1>>(),
    subject: typia.random<string & tags.MinLength<1>>(),
    html_content: typia.random<string & tags.MinLength<1>>(),
    text_content: typia.random<string & tags.MinLength<1>>(),
    description: typia.random<string & tags.MinLength<1>>() satisfies
      | string
      | null as string | null,
    is_active: true,
  } satisfies IEcommerceEmailTemplate.ICreate;
  // 3. Create active email template using utility function
  const activeTemplate =
    await generate_random_ecommerce_super_administrator_email_templates_create(
      superAdminConnection,
      { body: templateCreateData },
    );
  typia.assert(activeTemplate);
  // 4. Preserve original field values for partial update validation
  const originalValues = {
    name: activeTemplate.name,
    category: activeTemplate.category,
    subject: activeTemplate.subject,
    html_content: activeTemplate.html_content,
    text_content: activeTemplate.text_content,
    description: activeTemplate.description,
  };
  // 5. Perform partial update with ONLY is_active field changed
  const deactivatedTemplate =
    await api.functional.ecommerce.superAdministrator.email_templates.update(
      superAdminConnection,
      {
        templateId: activeTemplate.id,
        body: {
          is_active: false,
        } satisfies IEcommerceEmailTemplate.IUpdate,
      },
    );
  typia.assert(deactivatedTemplate);
  // 6. Validate partial update behavior - only is_active changed
  TestValidator.equals(
    "template ID unchanged",
    deactivatedTemplate.id,
    activeTemplate.id,
  );
  TestValidator.equals(
    "name remains unchanged",
    deactivatedTemplate.name,
    originalValues.name,
  );
  TestValidator.equals(
    "category remains unchanged",
    deactivatedTemplate.category,
    originalValues.category,
  );
  TestValidator.equals(
    "subject remains unchanged",
    deactivatedTemplate.subject,
    originalValues.subject,
  );
  TestValidator.equals(
    "html_content remains unchanged",
    deactivatedTemplate.html_content,
    originalValues.html_content,
  );
  TestValidator.equals(
    "text_content remains unchanged",
    deactivatedTemplate.text_content,
    originalValues.text_content,
  );
  TestValidator.equals(
    "description remains unchanged",
    deactivatedTemplate.description,
    originalValues.description,
  );
  TestValidator.equals(
    "is_active field updated",
    deactivatedTemplate.is_active,
    false,
  );
  // 7. Reactivate with additional field update to test partial semantics
  const newDescription = "Reactivated with updated description";
  const reactivatedTemplate =
    await api.functional.ecommerce.superAdministrator.email_templates.update(
      superAdminConnection,
      {
        templateId: activeTemplate.id,
        body: {
          is_active: true,
          description: newDescription,
        } satisfies IEcommerceEmailTemplate.IUpdate,
      },
    );
  typia.assert(reactivatedTemplate);
  // 8. Validate partial update with multiple fields
  TestValidator.equals(
    "template ID remains",
    reactivatedTemplate.id,
    activeTemplate.id,
  );
  TestValidator.equals(
    "name still unchanged",
    reactivatedTemplate.name,
    originalValues.name,
  );
  TestValidator.equals(
    "category still unchanged",
    reactivatedTemplate.category,
    originalValues.category,
  );
  TestValidator.equals(
    "subject still unchanged",
    reactivatedTemplate.subject,
    originalValues.subject,
  );
  TestValidator.equals(
    "html_content still unchanged",
    reactivatedTemplate.html_content,
    originalValues.html_content,
  );
  TestValidator.equals(
    "text_content still unchanged",
    reactivatedTemplate.text_content,
    originalValues.text_content,
  );
  TestValidator.equals(
    "description field updated",
    reactivatedTemplate.description,
    newDescription,
  );
  TestValidator.equals(
    "is_active field updated again",
    reactivatedTemplate.is_active,
    true,
  );
}
