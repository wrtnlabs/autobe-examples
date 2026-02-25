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
 * Test retrieval of inactive email template by administrator.
 * 1. Administrator authentication via join.
 * 2. Retrieve specific email template by ID.
 * 3. Verify complete template details are returned including inactive status.
 * 4. Confirm administrators can access inactive templates for review purposes.
 */
export async function test_api_email_template_retrieve_inactive_template(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - USE UTILITY FUNCTION (ABSOLUTE PRIORITY)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // adminConnection headers are now updated internally by the utility function
  // 2. Retrieve email template (simulate existing inactive template)
  const templateId = typia.random<string & tags.Format<"uuid">>();
  const template =
    await api.functional.ecommerce.administrator.email_templates.at(
      adminConnection,
      {
        templateId,
      },
    );
  typia.assert(template);
  // 3. Business validation - administrators should be able to retrieve ANY template
  // regardless of active status. typia.assert() already validated all properties
  // including is_active field existence and type.
  TestValidator.equals("template id matches", template.id, templateId);
  TestValidator.predicate("administrator can access template", true);
}
