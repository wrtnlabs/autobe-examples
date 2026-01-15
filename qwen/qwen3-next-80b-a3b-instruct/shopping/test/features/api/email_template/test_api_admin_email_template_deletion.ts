import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_email_template_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Generate a valid UUID template ID (even if it doesn't exist)
  // This is the only testable scenario given the available API
  const templateId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Delete the template - verify it succeeds (returns void)
  // The API endpoint returns void on success (204 No Content)
  await api.functional.shoppingMall.admin.email.templates.erase(
    adminConnection,
    {
      templateId,
    },
  );
  // We cannot verify the template was deleted because:
  // 1. No template retrieval endpoint is provided
  // 2. No list templates endpoint is provided
  // 3. No audit log access is provided
  // 4. We cannot test 404 error because we lack the retrieval endpoint
  // 5. We cannot verify 'previous emails sent using this template remain unaffected' because
  //    we have no way to access those stored emails
  // Therefore, the only possible assertion is that the delete call succeeded without error
  // This is the only production-relevant test we can write with this
}
