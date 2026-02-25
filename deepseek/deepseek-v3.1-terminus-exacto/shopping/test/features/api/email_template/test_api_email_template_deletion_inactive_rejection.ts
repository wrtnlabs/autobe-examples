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

export async function test_api_email_template_deletion_inactive_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create an inactive email template
  const template =
    await generate_random_ecommerce_administrator_email_templates_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          category: "notification",
          subject: RandomGenerator.paragraph({ sentences: 1 }),
          html_content: RandomGenerator.paragraph({ sentences: 2 }),
          text_content: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: false, // INACTIVE template
        },
      },
    );
  typia.assert(template);
  // 3. Attempt to delete the inactive template - should be rejected
  await TestValidator.httpError(
    "inactive template deletion should be rejected",
    [400, 422, 403], // Common error statuses for business rule violations
    async () => {
      await api.functional.ecommerce.administrator.email_templates.erase(
        adminConnection,
        {
          templateId: template.id,
        },
      );
    },
  );
}
