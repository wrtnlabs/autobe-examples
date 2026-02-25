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
 * Test retrieving a non-existent email template.
 *
 * This test verifies proper error handling when attempting to retrieve
 * an email template that does not exist in the system. The administrator
 * authenticates first, then attempts to retrieve a template using a
 * randomly generated UUID that is guaranteed to not exist.
 */
export async function test_api_email_template_retrieve_non_existent_template(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Generate a valid but non-existent UUID
  const nonExistentTemplateId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent template and validate 404 error
  await TestValidator.httpError(
    "retrieve non-existent template",
    404,
    async () => {
      await api.functional.ecommerce.administrator.email_templates.at(
        adminConnection,
        {
          templateId: nonExistentTemplateId,
        },
      );
    },
  );
}
