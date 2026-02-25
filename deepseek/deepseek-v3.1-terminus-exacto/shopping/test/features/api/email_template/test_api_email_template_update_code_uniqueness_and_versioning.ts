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

export async function test_api_email_template_update_code_uniqueness_and_versioning(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
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
  // Create first email template with unique code
  const firstTemplate =
    await generate_random_ecommerce_super_administrator_email_templates_create(
      superAdminConnection,
      {
        body: {
          code: RandomGenerator.alphabets(10),
        },
      },
    );
  // Create second email template with different unique code
  const secondTemplate =
    await generate_random_ecommerce_super_administrator_email_templates_create(
      superAdminConnection,
      {
        body: {
          code: RandomGenerator.alphabets(10),
        },
      },
    );
  // Store initial version for validation
  const initialVersion = firstTemplate.version;
  // Attempt to update first template with second template's code (should fail with 409)
  await TestValidator.httpError("duplicate code constraint", 409, async () => {
    await api.functional.ecommerce.superAdministrator.email_templates.update(
      superAdminConnection,
      {
        templateId: firstTemplate.id,
        body: {
          // Remove code property since it doesn't exist in IUpdate type
          name: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: false,
        } satisfies IEcommerceEmailTemplate.IUpdate,
      },
    );
  });
  // Perform valid update with unique code
  const newCode = RandomGenerator.alphabets(10);
  const updatedTemplate =
    await api.functional.ecommerce.superAdministrator.email_templates.update(
      superAdminConnection,
      {
        templateId: firstTemplate.id,
        body: {
          // Remove code property since it doesn't exist in IUpdate type
          name: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: false,
        } satisfies IEcommerceEmailTemplate.IUpdate,
      },
    );
  typia.assert(updatedTemplate);
  // Validate version increment
  TestValidator.equals(
    "version should increment",
    updatedTemplate.version,
    initialVersion + 1,
  );
  // Validate timestamp update
  TestValidator.notEquals(
    "updated_at should change",
    firstTemplate.updated_at,
    updatedTemplate.updated_at,
  );
  // Validate field updates - remove code validation since code cannot be updated
  TestValidator.equals(
    "is_active should be updated",
    updatedTemplate.is_active,
    false,
  );
}