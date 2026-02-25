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

export async function test_api_email_template_soft_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
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
  typia.assert(authorized);
  // Create an email template
  const template =
    await generate_random_ecommerce_super_administrator_email_templates_create(
      superAdminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          category: "notification",
          subject: RandomGenerator.paragraph({ sentences: 1 }),
          html_content: RandomGenerator.content({ paragraphs: 1 }),
          text_content: RandomGenerator.content({ paragraphs: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceEmailTemplate.ICreate,
      },
    );
  typia.assert(template);
  // Verify template is active and not deleted
  TestValidator.equals("template should be active", template.is_active, true);
  TestValidator.equals(
    "template should not be deleted initially",
    template.deleted_at,
    null,
  );
  // Soft delete the template
  await api.functional.ecommerce.superAdministrator.email_templates.erase(
    superAdminConnection,
    {
      templateId: template.id,
    },
  );
  // Verify template code uniqueness is preserved by attempting to create template with same code
  await TestValidator.error(
    "template code should remain unique after soft deletion",
    async () => {
      await api.functional.ecommerce.superAdministrator.email_templates.create(
        superAdminConnection,
        {
          body: {
            code: template.code,
            name: RandomGenerator.paragraph({ sentences: 2 }),
            category: "notification",
            subject: RandomGenerator.paragraph({ sentences: 1 }),
            html_content: RandomGenerator.content({ paragraphs: 1 }),
            text_content: RandomGenerator.content({ paragraphs: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            is_active: true,
          } satisfies IEcommerceEmailTemplate.ICreate,
        },
      );
    },
  );
}
