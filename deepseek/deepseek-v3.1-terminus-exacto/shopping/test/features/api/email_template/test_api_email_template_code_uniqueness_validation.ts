import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test email template update functionality and validation.
 * Due to API limitations (only update endpoint available), this test focuses on:
 * 1. Authentication validation
 * 2. Error handling for non-existent templates
 * 3. Basic update parameter validation
 *
 * Note: Code uniqueness constraint testing requires template creation/listing
 * capabilities which are not available in the current API.
 */
export async function test_api_email_template_code_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(administrator);
  // Test 1: Update with invalid template ID (should fail)
  const invalidTemplateId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update should fail with non-existent template ID",
    async () => {
      await api.functional.ecommerce.administrator.email_templates.update(
        adminConnection,
        {
          templateId: invalidTemplateId,
          body: {
            name: "Test Template",
          } satisfies IEcommerceEmailTemplate.IUpdate,
        },
      );
    },
  );
  // Test 2: Update with valid UUID format but non-existent template
  const randomTemplateId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update should fail with random valid UUID",
    async () => {
      await api.functional.ecommerce.administrator.email_templates.update(
        adminConnection,
        {
          templateId: randomTemplateId,
          body: {
            name: "Updated Template Name",
            category: "Test Category",
            subject: "Test Subject",
            html_content: "<p>Test content</p>",
            text_content: "Test content",
            is_active: true,
          } satisfies IEcommerceEmailTemplate.IUpdate,
        },
      );
    },
  );
  // Test 3: Validate that the API properly validates template ID format
  // This tests the API's input validation for the templateId parameter
  const invalidFormatId = "not-a-valid-uuid";
  await TestValidator.error(
    "update should fail with invalid UUID format",
    async () => {
      // This should fail at the parameter validation level
      await api.functional.ecommerce.administrator.email_templates.update(
        adminConnection,
        {
          templateId: invalidFormatId as string & tags.Format<"uuid">,
          body: {
            name: "Test Template",
          } satisfies IEcommerceEmailTemplate.IUpdate,
        },
      );
    },
  );
}
