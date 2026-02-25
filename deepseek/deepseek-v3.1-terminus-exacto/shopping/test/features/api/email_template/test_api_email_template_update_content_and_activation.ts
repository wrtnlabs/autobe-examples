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

export async function test_api_email_template_update_content_and_activation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_administrator_join(
    adminConnection,
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
  typia.assert(authResponse);
  // 2. Create initial email template
  const createResponse =
    await generate_random_ecommerce_super_administrator_email_templates_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          category: "notification",
          subject: "Welcome to our platform",
          html_content: `<h1>Welcome {{user_name}}</h1><p>Thank you for joining!</p>`,
          text_content: "Welcome {{user_name}}. Thank you for joining!",
          description: null,
          is_active: true,
        } satisfies IEcommerceEmailTemplate.ICreate,
      },
    );
  typia.assert(createResponse);
  // 3. Update email template with partial data
  const updateResponse =
    await api.functional.ecommerce.superAdministrator.email_templates.update(
      adminConnection,
      {
        templateId: createResponse.id,
        body: {
          subject: "Updated: Welcome to our amazing platform",
          html_content: `<h1>Welcome {{user_name}}!</h1><p>We're excited to have you on board.</p>`,
          text_content:
            "Welcome {{user_name}}! We're excited to have you on board.",
          description: "Updated welcome template with improved messaging",
          is_active: false,
        } satisfies IEcommerceEmailTemplate.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // 4. Validate update results
  TestValidator.equals(
    "id should remain unchanged",
    updateResponse.id,
    createResponse.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updateResponse.created_at,
    createResponse.created_at,
  );
  TestValidator.equals(
    "code should remain unchanged",
    updateResponse.code,
    createResponse.code,
  );
  TestValidator.equals(
    "subject should be updated",
    updateResponse.subject,
    "Updated: Welcome to our amazing platform",
  );
  TestValidator.equals(
    "html_content should be updated",
    updateResponse.html_content,
    `<h1>Welcome {{user_name}}!</h1><p>We're excited to have you on board.</p>`,
  );
  TestValidator.equals(
    "text_content should be updated",
    updateResponse.text_content,
    "Welcome {{user_name}}! We're excited to have you on board.",
  );
  TestValidator.equals(
    "description should be updated",
    updateResponse.description,
    "Updated welcome template with improved messaging",
  );
  TestValidator.equals(
    "is_active should be updated to false",
    updateResponse.is_active,
    false,
  );
  TestValidator.equals(
    "version should increment by 1",
    updateResponse.version,
    createResponse.version + 1,
  );
  TestValidator.notEquals(
    "updated_at should be more recent",
    updateResponse.updated_at,
    createResponse.updated_at,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updateResponse.deleted_at,
    null,
  );
  // 5. Validate partial update semantics - fields not included in update should remain unchanged
  TestValidator.equals(
    "name should remain unchanged",
    updateResponse.name,
    createResponse.name,
  );
  TestValidator.equals(
    "category should remain unchanged",
    updateResponse.category,
    createResponse.category,
  );
  // 6. Validate timestamp ordering
  const createdAt = new Date(createResponse.created_at);
  const updatedAt = new Date(updateResponse.updated_at);
  TestValidator.predicate(
    "updated_at should be after created_at",
    updatedAt > createdAt,
  );
}
