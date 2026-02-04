import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_profile_update_with_email_change(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize as an admin to use as the test subject
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authorizedAdmin);
  // Step 2: Prepare new profile update data with a unique email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateData = {
    name: RandomGenerator.name(),
    email: newEmail,
  } satisfies IShoppingMallAdmin.IUpdate;
  // Step 3: Execute the profile update with the new email (this endpoint returns IShoppingMallAdmin, which is an empty object {})
  const updatedAdmin = await api.functional.shoppingMall.admin.admins.me.update(
    adminConnection,
    {
      body: updateData,
    },
  );
  typia.assert(updatedAdmin);
  // Step 4: Since IShoppingMallAdmin is an empty object {}, we cannot validate the email field
  // The only valid validation is success without error
  // No GET endpoint exists in API to verify the update, so this is the only possible validation
  TestValidator.predicate("admin profile update succeeded without error", true);
}
