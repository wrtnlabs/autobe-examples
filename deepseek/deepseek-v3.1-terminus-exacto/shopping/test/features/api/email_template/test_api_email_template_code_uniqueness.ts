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

export async function test_api_email_template_code_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string &
        tags.Format<"password"> as string & tags.Format<"password">,
    },
  });
  typia.assert(authorizedAdmin);
  // Generate unique template code
  const templateCode = RandomGenerator.alphaNumeric(10);
  // Create first email template with unique code
  const firstTemplate =
    await api.functional.ecommerce.administrator.email_templates.create(
      adminConnection,
      {
        body: {
          code: templateCode,
          name: RandomGenerator.name(),
          category: "notification",
          subject: RandomGenerator.paragraph({ sentences: 1 }),
          html_content: RandomGenerator.content({ paragraphs: 1 }),
          text_content: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceEmailTemplate.ICreate,
      },
    );
  typia.assert(firstTemplate);
  // Verify first template was created with correct code
  TestValidator.equals(
    "template code matches",
    firstTemplate.code,
    templateCode,
  );
  // Attempt to create second template with same code but different other fields
  await TestValidator.error("duplicate template code should fail", async () => {
    await api.functional.ecommerce.administrator.email_templates.create(
      adminConnection,
      {
        body: {
          code: templateCode, // Same code as first template
          name: RandomGenerator.name(), // Different name
          category: "marketing", // Different category
          subject: RandomGenerator.paragraph({ sentences: 2 }), // Different subject
          html_content: RandomGenerator.content({ paragraphs: 2 }), // Different HTML content
          text_content: RandomGenerator.paragraph({ sentences: 3 }), // Different text content
          description: RandomGenerator.paragraph({ sentences: 1 }), // Add description
          is_active: false, // Different active status
        } satisfies IEcommerceEmailTemplate.ICreate,
      },
    );
  });
  // Create another template with different code to verify system still works
  const differentCode = RandomGenerator.alphaNumeric(10);
  const thirdTemplate =
    await api.functional.ecommerce.administrator.email_templates.create(
      adminConnection,
      {
        body: {
          code: differentCode,
          name: RandomGenerator.name(),
          category: "alert",
          subject: RandomGenerator.paragraph({ sentences: 1 }),
          html_content: RandomGenerator.content({ paragraphs: 1 }),
          text_content: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceEmailTemplate.ICreate,
      },
    );
  typia.assert(thirdTemplate);
  // Verify third template was created successfully with different code
  TestValidator.equals(
    "different template code matches",
    thirdTemplate.code,
    differentCode,
  );
  TestValidator.notEquals(
    "different template IDs",
    firstTemplate.id,
    thirdTemplate.id,
  );
}
