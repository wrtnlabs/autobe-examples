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
import { generate_random_ecommerce_administrator_email_templates_create } from "../../../generate/generate_random_ecommerce_administrator_email_templates_create";
import { prepare_random_ecommerce_email_template } from "../../../prepare/prepare_random_ecommerce_email_template";

export async function test_api_email_template_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create email template with all required fields
  const emailTemplate =
    await api.functional.ecommerce.administrator.email_templates.create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          category: "notification",
          subject: RandomGenerator.paragraph({ sentences: 1 }),
          html_content: RandomGenerator.content({ paragraphs: 1 }),
          text_content: RandomGenerator.content({ paragraphs: 1 }),
          is_active: true,
        } satisfies IEcommerceEmailTemplate.ICreate,
      },
    );
  typia.assert(emailTemplate);
  // Validate business logic (not type validation since typia.assert() already handled that)
  TestValidator.equals(
    "template code should be returned",
    typeof emailTemplate.code,
    "string",
  );
  TestValidator.equals(
    "template name should be returned",
    typeof emailTemplate.name,
    "string",
  );
  TestValidator.equals(
    "template category should be returned",
    typeof emailTemplate.category,
    "string",
  );
  TestValidator.equals(
    "template subject should be returned",
    typeof emailTemplate.subject,
    "string",
  );
  TestValidator.equals(
    "html content should be returned",
    typeof emailTemplate.html_content,
    "string",
  );
  TestValidator.equals(
    "text content should be returned",
    typeof emailTemplate.text_content,
    "string",
  );
  TestValidator.equals(
    "is_active should match input",
    emailTemplate.is_active,
    true,
  );
  TestValidator.predicate(
    "version should be positive integer",
    emailTemplate.version > 0,
  );
}
