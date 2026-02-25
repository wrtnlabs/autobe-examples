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

export async function test_api_email_template_deletion_idempotency(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate using utility function
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
  // Create an email template to test deletion using utility function
  const template =
    await generate_random_ecommerce_super_administrator_email_templates_create(
      superAdminConnection,
      {
        body: {
          code: `test_template_${RandomGenerator.alphaNumeric(8)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          category: "notification",
          subject: RandomGenerator.paragraph({ sentences: 1 }),
          html_content: RandomGenerator.content({ paragraphs: 1 }),
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        } satisfies IEcommerceEmailTemplate.ICreate,
      },
    );
  typia.assert(template);
  // First deletion - should succeed
  await api.functional.ecommerce.superAdministrator.email_templates.erase(
    superAdminConnection,
    {
      templateId: template.id,
    },
  );
  // Second deletion attempt - should also succeed (idempotent)
  await api.functional.ecommerce.superAdministrator.email_templates.erase(
    superAdminConnection,
    {
      templateId: template.id,
    },
  );
  // Test successful completion without errors
  TestValidator.predicate("idempotent deletion completed successfully", true);
}
